// Shared helpers for the Somasu Netlify functions (not a function itself).
// Environment variables (Netlify > Site configuration > Environment variables):
//   SUPABASE_URL          https://<project>.supabase.co
//   SUPABASE_KEY          the publishable key (same as config.js)
//   SUPABASE_SECRET_KEY   the secret key. Server only, never in config.js or chat.
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   notification keys (Admin guide)
//   VAPID_SUBJECT         mailto: address push services can contact, e.g. mailto:SomiahDev@proton.me
import webpush from 'web-push';

export const env = k => process.env[k] || '';
const keyHeaders = key => {
  const h = { apikey: key };
  if (key.startsWith('eyJ')) h.authorization = 'Bearer ' + key; // older-style keys
  return h;
};

/** Database call with the secret key (skips the family-only rules, so only used server side). */
export async function rest(path, { method = 'GET', body, prefer } = {}) {
  const headers = Object.assign({ 'content-type': 'application/json' }, keyHeaders(env('SUPABASE_SECRET_KEY')));
  if (prefer) headers.prefer = prefer;
  const r = await fetch(env('SUPABASE_URL') + '/rest/v1/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`database ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

/** Who is calling? Returns their members row, or null if not signed in or not family. */
export async function whoIs(req) {
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer \S+/.test(auth)) return null;
  const u = await fetch(env('SUPABASE_URL') + '/auth/v1/user', { headers: Object.assign(keyHeaders(env('SUPABASE_KEY')), { authorization: auth }) });
  if (!u.ok) return null;
  const email = String((await u.json()).email || '').toLowerCase();
  if (!email) return null;
  const rows = await rest('members?select=id,name,email,is_admin&email=eq.' + encodeURIComponent(email));
  return rows && rows[0] || null;
}

let sender = null; // swapped out in tests
export function _setSender(fn) { sender = fn; }

/** Send one message to a list of devices. Devices the push service says are gone get removed. */
export async function sendToSubs(subs, msg) {
  if (!sender) {
    webpush.setVapidDetails(env('VAPID_SUBJECT') || 'mailto:admin@example.com', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
    sender = (sub, payload, opts) => webpush.sendNotification(sub, payload, opts);
  }
  let sent = 0, gone = 0, failed = 0;
  await Promise.all(subs.map(async s => {
    try {
      await sender({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 6 * 3600, urgency: 'normal' });
      sent++;
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) { gone++; await rest('push_subscriptions?id=eq.' + s.id, { method: 'DELETE' }).catch(() => {}); }
      else { failed++; console.warn('push failed', e && (e.statusCode || e.message)); }
    }
  }));
  return { sent, gone, failed };
}

/* ---- dates, always on UK time ---- */
const TZ = 'Europe/London';
export const fmtTime = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
export const fmtDay = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });

/* Repeating events, the same rules as the app (app.js, occurrences). Runs with
   process.env.TZ = 'Europe/London' so "every week at 6pm" stays 6pm across the clock change. */
const PERIOD = { daily: 1, weekly: 7, fortnightly: 14 };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function occurrences(o, from, to) {
  const out = [], dur = o.end - o.start;
  if (!o.repeat || o.repeat === 'none') { if (o.end > from && o.start < to) out.push({ start: o.start, end: o.end }); return out; }
  let i = 0;
  if (PERIOD[o.repeat]) i = Math.max(0, Math.floor((from - o.start - dur) / (PERIOD[o.repeat] * 86400000)) - 1);
  for (let guard = 0; guard < 1500; guard++, i++) {
    let s;
    if (PERIOD[o.repeat]) s = addDays(o.start, i * PERIOD[o.repeat]);
    else if (o.repeat === 'monthly') {
      s = new Date(o.start); s.setDate(1); s.setMonth(s.getMonth() + i);
      const dim = new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate();
      if (o.start.getDate() > dim) continue;
      s.setDate(o.start.getDate());
    } else if (o.repeat === 'yearly') { s = new Date(o.start); s.setFullYear(s.getFullYear() + i); }
    else break;
    if (s >= to) break;
    if (o.until && s > o.until) break;
    const e = new Date(+s + dur);
    if (e > from && !(o.exdates && o.exdates.has(ymd(s)))) out.push({ start: s, end: e });
  }
  return out;
}
export { addDays, ymd };
