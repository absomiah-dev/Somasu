// Somasu: fetches a linked calendar's iCal feed on the server, because Google,
// Outlook and Apple don't let a web page read their feeds directly (browser CORS rules).
//
// Locked down two ways so it can't be used as a free proxy by strangers:
//  1. Only calendar hosts on the list below (add more in Netlify with the
//     EXTRA_ICS_HOSTS environment variable, comma-separated, e.g. "school.co.uk").
//  2. If SUPABASE_URL and SUPABASE_KEY are set in Netlify, the caller must be
//     signed in to Somasu.
const HOSTS = ['calendar.google.com', 'outlook.office365.com', 'outlook.live.com', 'outlook.office.com', 'icloud.com', 'calendar.yahoo.com'];

export default async (req) => {
  const extra = (process.env.EXTRA_ICS_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const allowed = [...HOSTS, ...extra];
  let target;
  try { target = new URL(new URL(req.url).searchParams.get('url') || ''); } catch { return new Response('Bad link', { status: 400 }); }
  if (target.protocol === 'webcal:') target = new URL(target.href.replace(/^webcal:/, 'https:'));
  const host = target.hostname.toLowerCase();
  if (target.protocol !== 'https:' || !allowed.some(h => host === h || host.endsWith('.' + h))) {
    return new Response('That calendar host is not on the allowed list', { status: 403 });
  }
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    const auth = req.headers.get('authorization') || '';
    const who = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', { headers: { apikey: process.env.SUPABASE_KEY, authorization: auth } });
    if (!who.ok) return new Response('Sign in first', { status: 401 });
  }
  try {
    const r = await fetch(target.href, { headers: { 'user-agent': 'Somasu family planner', accept: 'text/calendar,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
    if (!r.ok) return new Response('Calendar returned ' + r.status, { status: 502 });
    const text = await r.text();
    if (text.length > 5_000_000) return new Response('Calendar too large', { status: 413 });
    return new Response(text, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'private, max-age=300' } });
  } catch (e) {
    return new Response('Could not reach the calendar', { status: 504 });
  }
};

export const config = { path: '/api/ics' };
