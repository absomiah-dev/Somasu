// Somasu: looks after family members' sign-ins, so an admin never has to visit Supabase (26 R9).
// Called by the app when an admin adds, edits or removes a family member. Only admins may use it.
// It talks to Supabase's sign-in service with the secret key, which stays here on Netlify and
// never reaches anyone's phone. Family membership itself (the members table) is still saved by
// the app as before; this only creates, changes or removes the matching sign-in.
//
// POST /api/member-login  { action, email, ... }
//   create        { email, name, password }  make a sign-in (already confirmed) with a starting password.
//                                            If a sign-in already exists for that email it is left as it is.
//   set-password  { email, password }        give an existing member a new starting password.
//   change-email  { email, new_email }       move a member's sign-in to a new email address.
//   remove        { email }                  delete the sign-in of a member who is being removed.
import { whoIs, env, reason } from '../lib/somasu.mjs';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PW_RULES = [p => p.length >= 10, p => /[A-Z]/.test(p), p => /[a-z]/.test(p), p => /\d/.test(p)];
export const strongEnough = p => typeof p === 'string' && p.length <= 72 && PW_RULES.every(f => f(p));
const json = (body, status = 200) => Response.json(body, { status });

// New-style secret keys (sb_secret_...) go in the apikey header only; Supabase swaps them for an
// admin token itself. Older keys (eyJ...) also go in Authorization, as in netlify/lib/somasu.mjs.
function adminHeaders() {
  const key = env('SUPABASE_SECRET_KEY'), h = { 'content-type': 'application/json', apikey: key };
  if (key.startsWith('eyJ')) h.authorization = 'Bearer ' + key;
  return h;
}
/** Call Supabase's sign-in admin service with the secret key. */
async function admin(path, { method = 'GET', body } = {}) {
  const r = await fetch(env('SUPABASE_URL') + '/auth/v1/admin/' + path, {
    method,
    headers: adminHeaders(),
    body: body ? JSON.stringify(body) : undefined
  });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (_) { j = { msg: t }; }
  return { ok: r.ok, status: r.status, body: j };
}
const msgOf = b => (b && (b.msg || b.message || b.error_description || b.error || b.code)) || '';

/** Find a sign-in by email (a family has a handful of users, so one page is plenty). */
export async function findUser(email) {
  for (let page = 1; page <= 5; page++) {
    const r = await admin(`users?page=${page}&per_page=200`);
    if (!r.ok) throw new Error(`sign-in service ${r.status}: ${msgOf(r.body)}`);
    const users = (r.body && r.body.users) || [];
    const u = users.find(x => String(x.email || '').toLowerCase() === email);
    if (u) return u;
    if (users.length < 200) return null;
  }
  return null;
}

export default async (req) => {
  try { return await handle(req); }
  catch (e) { console.error('member-login failed', e); return json({ error: reason(e) }, 500); }
};

async function handle(req) {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!env('SUPABASE_SECRET_KEY')) return json({ error: 'Somasu’s secret key isn’t set up on Netlify (SUPABASE_SECRET_KEY).' }, 500);
  const me = await whoIs(req);
  if (!me) return json({ error: 'Please sign in again.' }, 401);
  if (!me.is_admin) return json({ error: 'Only an admin can do this.' }, 403);
  let b; try { b = await req.json(); } catch (_) { return json({ error: 'Bad request' }, 400); }
  const email = String(b.email || '').trim().toLowerCase();
  if (!EMAIL.test(email)) return json({ error: 'That doesn’t look like an email address.' }, 400);
  const name = String(b.name || '').trim().slice(0, 40);

  if (b.action === 'create') {
    if (!strongEnough(b.password)) return json({ error: 'The starting password needs at least 10 characters, with a capital letter, a small letter and a number.' }, 400);
    const r = await admin('users', { method: 'POST', body: { email, password: b.password, email_confirm: true, user_metadata: name ? { display_name: name, full_name: name } : {} } });
    if (r.ok) return json({ created: true });
    if (r.status === 422 || /already|exists|registered/i.test(msgOf(r.body))) return json({ created: false, existed: true });
    return json({ error: 'Couldn’t create the sign-in: ' + msgOf(r.body) }, 502);
  }

  if (b.action === 'set-password') {
    if (!strongEnough(b.password)) return json({ error: 'The new password needs at least 10 characters, with a capital letter, a small letter and a number.' }, 400);
    const u = await findUser(email);
    if (!u) return json({ error: 'There’s no sign-in for that email yet.' }, 404);
    const r = await admin('users/' + u.id, { method: 'PUT', body: { password: b.password } });
    return r.ok ? json({ updated: true }) : json({ error: 'Couldn’t set the password: ' + msgOf(r.body) }, 502);
  }

  if (b.action === 'change-email') {
    const to = String(b.new_email || '').trim().toLowerCase();
    if (!EMAIL.test(to)) return json({ error: 'The new email doesn’t look like an email address.' }, 400);
    if (to === email) return json({ updated: false, same: true });
    const u = await findUser(email);
    if (!u) return json({ updated: false, missing: true });
    const r = await admin('users/' + u.id, { method: 'PUT', body: { email: to, email_confirm: true } });
    return r.ok ? json({ updated: true }) : json({ error: 'Couldn’t change the sign-in email: ' + msgOf(r.body) }, 502);
  }

  if (b.action === 'remove') {
    if (email === String(me.email || '').toLowerCase()) return json({ error: 'You can’t remove your own sign-in.' }, 400);
    const u = await findUser(email);
    if (!u) return json({ removed: false, missing: true });
    const r = await admin('users/' + u.id, { method: 'DELETE' });
    return r.ok ? json({ removed: true }) : json({ error: 'Couldn’t remove the sign-in: ' + msgOf(r.body) }, 502);
  }

  return json({ error: 'Unknown action' }, 400);
}

export const config = { path: '/api/member-login' };
