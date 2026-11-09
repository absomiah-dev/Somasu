// Somasu bin day, server side (26 R10): the rule, the 7pm reminder, sent once.
// Run from the site folder after npm ci:  SITE=$PWD node <this file>
process.env.TZ = 'Europe/London';
const SITE = (process.env.SITE || process.cwd()).replace(/\\/g, '/');
process.env.SUPABASE_URL = 'https://x.supabase.co'; process.env.SUPABASE_KEY = 'sb_publishable_x'; process.env.SUPABASE_SECRET_KEY = 'sb_secret_x';
process.env.VAPID_PUBLIC_KEY = 'x'; process.env.VAPID_PRIVATE_KEY = 'y';
const lib = await import('file://' + SITE + '/netlify/lib/somasu.mjs');
const rem = await import('file://' + SITE + '/netlify/functions/reminders.mjs');
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(x)); };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// West Oxfordshire, Thursday 1 round, 2 Apr 2026 to 1 Apr 2027 (council calendar, 09-11-2026)
export const GREEN = ['2026-04-02','2026-04-16','2026-04-30','2026-05-14','2026-05-28','2026-06-11','2026-06-25','2026-07-09','2026-07-23','2026-08-06','2026-08-20','2026-09-03','2026-09-17','2026-10-01','2026-10-15','2026-10-29','2026-11-12','2026-11-26','2026-12-10','2026-12-24','2027-01-07','2027-01-21','2027-02-04','2027-02-18','2027-03-04','2027-03-18','2027-04-01'];
export const GREY = ['2026-04-09','2026-04-23','2026-05-07','2026-05-21','2026-06-04','2026-06-18','2026-07-02','2026-07-16','2026-07-30','2026-08-13','2026-08-27','2026-09-10','2026-09-24','2026-10-08','2026-10-22','2026-11-05','2026-11-19','2026-12-03','2026-12-17','2026-12-31','2027-01-14','2027-01-28','2027-02-11','2027-02-25','2027-03-11','2027-03-25'];
const CFG = { anchor: '2026-04-02', types: [{ name: 'Green bin', what: 'Recycling, food waste, garden waste', colour: '#2E8B57' }, { name: 'Grey bin', what: 'Rubbish, food waste', colour: '#5F6B66' }], out: 'Out by 6am', moves: [], remind: true };

const year = lib.binCollections(CFG, new Date(2026, 3, 1), new Date(2027, 3, 2));
ok('whole council year matches the published calendar (53 collections)', year.length === 53 &&
  JSON.stringify(year.filter(x => x.type.name === 'Green bin').map(x => ymd(x.date))) === JSON.stringify(GREEN) &&
  JSON.stringify(year.filter(x => x.type.name === 'Grey bin').map(x => ymd(x.date))) === JSON.stringify(GREY), year.map(x => ymd(x.date) + ' ' + x.type.name));
ok('all on Thursdays, across both clock changes', year.every(x => x.date.getDay() === 4));
const mv = lib.binCollections(Object.assign({}, CFG, { moves: [{ from: '2026-12-24', to: '2026-12-27' }, { from: '2026-12-31', to: '' }] }), new Date(2026, 11, 20), new Date(2027, 0, 10));
ok('bank holiday move and a cancelled collection', JSON.stringify(mv.map(x => [ymd(x.date), x.type.name, x.moved])) === JSON.stringify([['2026-12-27', 'Green bin', true], ['2027-01-07', 'Green bin', false]]), mv.map(x => [ymd(x.date), x.type.name]));
const back = lib.binCollections(CFG, new Date(2025, 0, 1), new Date(2025, 0, 20));
ok('works before the anchor date too', back.length === 3 && back.every(x => x.date.getDay() === 4), back.map(x => ymd(x.date)));
ok('one bin every week', lib.binCollections({ anchor: '2026-11-12', types: [{ name: 'Bin' }] }, new Date(2026, 10, 1), new Date(2026, 11, 1)).length === 4);
ok('bad settings give nothing', lib.binCollections({ anchor: 'x', types: [] }, new Date(), new Date(Date.now() + 864e6)).length === 0 && lib.binCollections(null, new Date(), new Date()).length === 0);

// reminder timing
const at = s => new Date(s);
let d = rem.binDue(CFG, at('2026-11-11T19:02:00'));
ok('Wed 11 Nov 7pm: a collection tomorrow, 12 Nov', d && ymd(d.date) === '2026-11-12', d);
ok('Thu 12 Nov is a green week (council calendar)', d && d.type.name === 'Green bin', d && d.type.name);
ok('not before 7pm', !rem.binDue(CFG, at('2026-11-11T18:59:00')));
ok('not after 7.30pm', !rem.binDue(CFG, at('2026-11-11T19:31:00')));
ok('no collection tomorrow: nothing', !rem.binDue(CFG, at('2026-11-10T19:02:00')));
ok('reminder switched off: nothing', !rem.binDue(Object.assign({}, CFG, { remind: false }), at('2026-11-11T19:02:00')));
ok('summer time: 7pm BST', !!rem.binDue(CFG, at('2026-07-01T19:05:00')));
const t = rem.binText(CFG, d);
ok('message text', t.title === '🗑️ Green bin tomorrow' && t.body === 'Recycling, food waste, garden waste · Out by 6am' && t.url === './#calendar/2026-11-12', t);

// a full scheduled run at 19:02 on Wed 11 Nov, twice: sent once, only to phones with Bin day on
let claimedDay = null, sent = [];
const subs = [{ id: 's1', member_id: 'A', endpoint: 'https://p/1', p256dh: 'k', auth: 'a', prefs: { bins: true } }, { id: 's2', member_id: 'M', endpoint: 'https://p/2', p256dh: 'k', auth: 'a', prefs: { bins: false } }, { id: 's3', member_id: 'K', endpoint: 'https://p/3', p256dh: 'k', auth: 'a', prefs: {} }];
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url), q = decodeURIComponent(u.search);
  if (u.pathname === '/rest/v1/events') return Response.json([]);
  if (u.pathname === '/rest/v1/push_subscriptions') return Response.json(subs);
  if (u.pathname === '/rest/v1/app_settings') {
    if (!opts.method || opts.method === 'GET') return Response.json(q.includes('key=eq.bins') ? [{ value: JSON.stringify(CFG) }] : []);
    const b = JSON.parse(opts.body);
    if (opts.method === 'PATCH') { const day = /value=neq\.(.*)$/.exec(q)[1]; if (claimedDay && claimedDay !== day) { claimedDay = b.value; return Response.json([b]); } return Response.json([]); }
    if (opts.method === 'POST') { if (claimedDay) return Response.json([]); claimedDay = b.value; return Response.json([b]); }
  }
  throw new Error('unexpected ' + opts.method + ' ' + url);
};
lib._setSender(async (sub, payload) => { sent.push({ to: sub.endpoint, msg: JSON.parse(payload) }); });
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : ['2026-11-11T19:02:00Z'])); } static now() { return new RealDate('2026-11-11T19:02:00Z').getTime(); } };
await rem.default(); await rem.default();
globalThis.Date = RealDate;
ok('scheduled run: sent once, not to the phone with Bin day off', sent.length === 2 && sent.every(s => s.to !== 'https://p/2') && sent[0].msg.title === '🗑️ Green bin tomorrow', sent);
ok('claim recorded for 12 Nov', claimedDay === '2026-11-12', claimedDay);
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
