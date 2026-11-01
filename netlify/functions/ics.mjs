// Somasu: fetches a linked calendar's iCal feed on the server, because Google,
// Outlook and Apple don't let a web page read their feeds directly (browser CORS rules).
//
// Locked down so it can't be used as a free proxy by strangers:
//  * With SUPABASE_URL and SUPABASE_KEY set (the normal set-up), only signed-in
//    Somasu users can use it, and it fetches any public https address, so school and
//    club calendars just work. Private-network and local addresses are refused, and
//    only real calendars (BEGIN:VCALENDAR) are passed back.
//  * Without them, only the calendar hosts below (plus EXTRA_ICS_HOSTS) are allowed.
const HOSTS = ['calendar.google.com', 'outlook.office365.com', 'outlook.live.com', 'outlook.office.com', 'icloud.com', 'calendar.yahoo.com'];

export default async (req) => {
  const extra = (process.env.EXTRA_ICS_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const allowed = [...HOSTS, ...extra];
  let target;
  try { target = new URL(new URL(req.url).searchParams.get('url') || ''); } catch { return new Response('Bad link', { status: 400 }); }
  if (target.protocol === 'webcal:') target = new URL(target.href.replace(/^webcal:/, 'https:'));
  const host = target.hostname.toLowerCase();
  const signedInMode = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
  const privateHost = /^(localhost|.*\.local|.*\.internal|.*\.localdomain)$/i.test(host) || /^\[/.test(host) ||
    /^(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7]))\./.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host);
  if (target.protocol !== 'https:' || privateHost || (target.port && target.port !== '443')) {
    return new Response('That address is not allowed', { status: 403 });
  }
  if (!signedInMode && !allowed.some(h => host === h || host.endsWith('.' + h))) {
    return new Response('That calendar host is not on the allowed list', { status: 403 });
  }
  if (signedInMode) {
    const auth = req.headers.get('authorization') || '';
    if (!/^Bearer \S+/.test(auth)) return new Response('Sign in first', { status: 401 });
    const who = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', { headers: { apikey: process.env.SUPABASE_KEY, authorization: auth } });
    if (!who.ok) return new Response('Sign in first', { status: 401 });
  }
  try {
    const r = await fetch(target.href, { headers: { 'user-agent': 'Somasu family planner', accept: 'text/calendar,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
    if (!r.ok) return new Response('Calendar returned ' + r.status, { status: 502 });
    const text = await r.text();
    if (text.length > 5_000_000) return new Response('Calendar too large', { status: 413 });
    if (!text.includes('BEGIN:VCALENDAR')) return new Response('That link is not a calendar', { status: 422 });
    return new Response(text, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=300' } });
  } catch (e) {
    return new Response('Could not reach the calendar', { status: 504 });
  }
};

export const config = { path: '/api/ics' };
