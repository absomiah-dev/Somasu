// Somasu: tells the rest of the family about a change, as a phone/computer
// notification. Called by the app straight after a save. The caller must be signed in
// and on the family list; they never get notified about their own changes.
import { rest, whoIs, sendToSubs, env } from '../lib/somasu.mjs';

const PREF = { items: 'lists', event: 'events', booking: 'bookings', test: null };
const clip = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const andList = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

export function compose(me, b) {
  const url = /^#[\w/-]*$/.test(b.url || '') ? './' + b.url : './';
  if (b.kind === 'test') return { title: 'Somasu', body: 'Notifications are working on this device.', tag: 'test', url: './' };
  if (b.kind === 'items') {
    const texts = (Array.isArray(b.texts) ? b.texts : []).map(t => clip(t, 40)).filter(Boolean).slice(0, 20);
    const count = Math.max(texts.length, Math.min(+b.count || 0, 500));
    if (!texts.length) return null;
    const shown = count > 3 ? texts.slice(0, 2).join(', ') + ` and ${count - 2} more` : andList(texts);
    return { title: clip(b.title, 60) || 'Lists', body: `${me.name} added ${shown}`, tag: 'items:' + url, url };
  }
  const what = clip(b.title, 80) || (b.kind === 'event' ? 'An event' : 'Something');
  const when = clip(b.when, 70);
  if (b.kind === 'event') {
    const verb = { added: 'added', changed: 'changed', cancelled: 'cancelled' }[b.action] || 'updated';
    return { title: `${me.name} ${verb} an event`, body: when ? `${what} · ${when}` : what, tag: 'event:' + what, url };
  }
  if (b.kind === 'booking') {
    const forWho = clip(b.for_name, 40);
    const forTxt = forWho && forWho !== me.name ? ` for ${forWho}` : '';
    const body = { added: `${me.name} booked it${forTxt}`, changed: `${me.name} changed a booking${forTxt}`, cancelled: `${me.name} cancelled a booking${forTxt}` }[b.action] || `${me.name} updated a booking`;
    return { title: what, body: when ? `${body} · ${when}` : body, tag: 'booking:' + what, url };
  }
  return null;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Use POST', { status: 405 });
  if (!env('SUPABASE_SECRET_KEY') || !env('VAPID_PRIVATE_KEY')) return new Response('Notifications are not set up on the server', { status: 503 });
  const me = await whoIs(req);
  if (!me) return new Response('Sign in first', { status: 401 });
  let b;
  try { b = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }
  if (!b || !(b.kind in PREF)) return new Response('Unknown kind', { status: 400 });
  const msg = compose(me, b);
  if (!msg) return Response.json({ sent: 0 });
  let subs = await rest('push_subscriptions?select=id,member_id,endpoint,p256dh,auth,prefs');
  if (b.kind === 'test') subs = subs.filter(s => s.member_id === me.id);
  else {
    subs = subs.filter(s => s.member_id !== me.id && (s.prefs || {})[PREF[b.kind]] !== false);
    if (b.kind === 'event' && Array.isArray(b.who) && b.who.length) subs = subs.filter(s => b.who.includes(s.member_id));
  }
  return Response.json(await sendToSubs(subs, msg));
};

export const config = { path: '/api/notify' };
