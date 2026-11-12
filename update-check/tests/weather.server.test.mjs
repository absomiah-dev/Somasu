// Somasu weather look-ahead and warnings, server side (26 R11).
// Run from the site folder after npm ci:  SITE=$PWD node <this file>
// Uses the real ECMWF forecasts for Witney saved on 12-11-2026 (wx-ens-*.json, wx-seas-*.json).
process.env.TZ = 'Europe/London';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = (process.env.SITE || process.cwd()).replace(/\\/g, '/');
process.env.SUPABASE_URL = 'https://x.supabase.co'; process.env.SUPABASE_KEY = 'sb_publishable_x'; process.env.SUPABASE_SECRET_KEY = 'sb_secret_x';
process.env.VAPID_PUBLIC_KEY = 'x'; process.env.VAPID_PRIVATE_KEY = 'y';
const lib = await import('file://' + SITE + '/netlify/lib/somasu.mjs');
const wx = await import('file://' + SITE + '/netlify/lib/weather.mjs');
const fn = await import('file://' + SITE + '/netlify/functions/weather.mjs');
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(x)); };
const ENS = JSON.parse(fs.readFileSync(path.join(HERE, 'wx-ens-2026-11-12.json'))), SEAS = JSON.parse(fs.readFileSync(path.join(HERE, 'wx-seas-2026-11-12.json')));

// --- the real forecast of 12 Nov 2026
const ahead = wx.headsUp(ENS, '2026-11-12');
ok('real forecast: frosty nights Fri 13 to Sat 14 Nov, quiet (no notification)', ahead.length === 1 && ahead[0].kind === 'frost' && ahead[0].from === '2026-11-13' && ahead[0].to === '2026-11-14' && ahead[0].quiet && !wx.worthTelling(ahead[0]), ahead);
ok('real forecast: no -11°C, no hard frost around 21 Nov', !ahead.some(h => /hard|severe/.test(h.kind)));
const tr = wx.trend(SEAS, '2026-11-12');
ok('trend: four weeks from Thu 26 Nov', tr.length === 4 && tr[0].from === '2026-11-26' && tr[3].to === '2026-12-23', tr.map(t => t.from + '..' + t.to));
ok('trend: plain words and numbers', tr.every(t => /frost/i.test(t.text) && Number.isInteger(t.nights) && t.frost >= 0 && t.frost <= 100), tr);

// --- made-up forecasts: 51 runs agreeing on a hard frost, snow, gales
const days = ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'];
function fake(f) { const d = { time: days }; for (let m = 0; m <= 50; m++) { const sfx = m ? '_member' + String(m).padStart(2, '0') : ''; for (const v of ['temperature_2m_min', 'temperature_2m_max', 'snowfall_sum', 'wind_gusts_10m_max']) d[v + sfx] = days.map((day, i) => f(v, i, m)); } return { daily: d }; }
const F = fake((v, i, m) => v === 'temperature_2m_min' ? (i === 6 || i === 7 ? (m < 40 ? -5 : 1) : 4) : v === 'temperature_2m_max' ? 8 : v === 'snowfall_sum' ? (i === 9 && m < 25 ? 3 : 0) : (i === 4 && m < 30 ? 90 : 30));
const a2 = wx.headsUp(F, '2026-11-12');
ok('hard frost on two nights joined into one item', a2.some(h => h.kind === 'hard-frost' && h.from === '2026-11-18' && h.to === '2026-11-19' && h.days === 2 && h.sure === '3 in 4'), a2);
ok('gales picked up (6 in 10 runs)', a2.some(h => h.kind === 'gales' && h.from === '2026-11-16'), a2);
ok('snow picked up when 1 in 2 runs settle it', a2.some(h => h.kind === 'snow' && h.from === '2026-11-21'), a2);
const t1 = wx.headsUpText(a2.find(h => h.kind === 'hard-frost'));
ok('heads-up message', t1.title === '❄️ Heads-up: hard frost from Wed 18 Nov' && /Down to about -5°C in Witney\. 3 in 4 forecasts agree\./.test(t1.body), t1);
ok('a hard frost 6 days ahead is worth telling; a frost tomorrow is not', wx.worthTelling(a2.find(h => h.kind === 'hard-frost')) && !wx.worthTelling({ quiet: true, ahead: 1, agree: 1, kind: 'frost' }));

// --- Met Office feed
const XML = `<?xml version="1.0"?><rss><channel><title>Met Office warnings for London &amp; South East England</title>
<item><title>Yellow warning of snow, ice affecting London &amp; South East England</title><link>https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings#?date=2026-11-20&amp;id=abc</link><description>Yellow warning of snow, ice affecting London &amp; South East England: valid from 0300 Fri 20 Nov to 1200 Fri 20 Nov</description><pubDate>Thu, 19 Nov 2026 10:00:00 GMT</pubDate><guid isPermaLink="false">abc-123</guid></item>
<item><title>Amber warning of wind affecting London &amp; South East England</title><link>https://evil.example/</link><description><![CDATA[Amber warning of <b>wind</b>: valid 1800 Sat to 0600 Sun]]></description><guid>def-456</guid></item></channel></rss>`;
const W = wx.parseWarnings(XML);
ok('feed: two warnings, level and type read', W.length === 2 && W[0].level === 'yellow' && W[0].type === 'snow, ice' && W[1].level === 'amber' && W[1].type === 'wind', W);
ok('feed: links only ever go to the Met Office, html removed', W[1].link.startsWith('https://www.metoffice.gov.uk/') && !/<b>/.test(W[1].text), W[1]);
ok('feed: empty feed gives no warnings', wx.parseWarnings('<rss><channel><title>x</title></channel></rss>').length === 0);
ok('warning message', wx.warningText(W[0]).title === '⚠️ Yellow weather warning: snow, ice', wx.warningText(W[0]));

// --- whole runs with everything mocked
let settings = {}, sent = [], calls = [];
const subs = [{ id: 's1', member_id: 'A', endpoint: 'https://p/1', p256dh: 'k', auth: 'a', prefs: {} }, { id: 's2', member_id: 'M', endpoint: 'https://p/2', p256dh: 'k', auth: 'a', prefs: { weather: false } }];
let feed = XML;
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url); calls.push(u.hostname);
  if (u.hostname === 'www.metoffice.gov.uk') return new Response(feed, { status: 200 });
  if (u.hostname === 'ensemble-api.open-meteo.com') return Response.json(F);
  if (u.hostname === 'seasonal-api.open-meteo.com') return Response.json(SEAS);
  if (u.pathname === '/rest/v1/push_subscriptions') return Response.json(subs);
  if (u.pathname === '/rest/v1/app_settings') {
    if (!opts.method || opts.method === 'GET') { const k = /key=eq\.(\w+)/.exec(decodeURIComponent(u.search))[1]; return Response.json(settings[k] ? [{ value: settings[k] }] : []); }
    const b = JSON.parse(opts.body); settings[b.key] = b.value; return new Response(null, { status: 201 });
  }
  throw new Error('unexpected ' + url);
};
lib._setSender(async (sub, payload) => { sent.push({ to: sub.endpoint, msg: JSON.parse(payload) }); });
let r = await fn.run(new Date('2026-11-12T23:30:00Z'));
ok('overnight run: saves warnings and outlook, sends nothing', r.warnings === 2 && r.outlook >= 3 && sent.length === 0 && JSON.parse(settings.weather_outlook).ahead.length >= 3, { r, sent });
r = await fn.run(new Date('2026-11-13T07:00:00Z'));
ok('7am run: warnings and firm heads-ups sent (3 at most), not to the phone with Weather off', sent.length === 3 && sent.every(s => s.to === 'https://p/1') && sent[0].msg.title.startsWith('⚠️'), sent.map(s => s.msg.title));
const ensCalls = calls.filter(h => h === 'ensemble-api.open-meteo.com').length;
sent = []; r = await fn.run(new Date('2026-11-13T07:30:00Z'));
ok('outlook not fetched again within 6 hours', calls.filter(h => h === 'ensemble-api.open-meteo.com').length === ensCalls, calls);
ok('next run: nothing sent twice', sent.length === 0, sent.map(s => s.msg.title));
ok('sent list kept', JSON.parse(settings.weather_sent).ids.length === 3, settings.weather_sent);
feed = XML.replace('abc-123', 'ghi-789'); sent = []; await fn.run(new Date('2026-11-13T08:30:00Z'));
ok('a new warning is sent straight away', sent.length === 1 && /ghi-789/.test(sent[0].msg.tag), sent);
const fetchFail = globalThis.fetch; globalThis.fetch = async (url, o) => new URL(url).hostname.endsWith('metoffice.gov.uk') ? new Response('down', { status: 503 }) : fetchFail(url, o);
r = await fn.run(new Date('2026-11-13T09:00:00Z'));
ok('Met Office down: noted, nothing breaks', r.errors.some(e => /warnings/.test(e)) && r.warnings === null, r);
globalThis.fetch = fetchFail;
ok('quiet hours: 10pm to 7am', fn.quietHours(new Date('2026-11-13T22:00:00Z')) && fn.quietHours(new Date('2026-11-13T06:59:00Z')) && !fn.quietHours(new Date('2026-11-13T07:00:00Z')));
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
