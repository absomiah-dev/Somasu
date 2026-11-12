// Somasu 14-day forecast in the Weather sheet (26 R14): 7 days with every other hour, days 8 to 14
// at a glance, calendar weather up to 14 days. Try-out mode, fixed clock, the real Open-Meteo
// forecast for Witney saved on 12-11-2026 (wx-14day-2026-11-12.json).
// Usage: node weather14.ui.test.js <public folder>
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const SRC = path.resolve(process.argv[2] || '.');
const WX = fs.readFileSync(path.join(__dirname, 'wx-14day-2026-11-12.json'), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'somasu-wx14-'));
fs.cpSync(SRC, tmp, {recursive: true});
fs.writeFileSync(path.join(tmp, 'config.js'), 'window.SOMASU_CONFIG = { supabaseUrl: "", supabaseKey: "", vapidPublicKey: "" };\n');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(tmp, p); if (!f.startsWith(tmp) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
async function page(b, now, opts = {}) {
  const ctx = await b.newContext({viewport: {width: opts.width || 390, height: 844}, locale: 'en-GB', timezoneId: 'Europe/London'});
  let fetches = 0, asked = '';
  await ctx.route('**/fonts.googleapis.com/**', r => r.abort());
  await ctx.route('**/api.open-meteo.com/**', r => { fetches++; asked = r.request().url(); r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: WX}); });
  await ctx.addInitScript(([now, tab, oldCache]) => { const Real = Date, off = new Real(now) - Real.now();
    window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [Real.now() + off])); } static now() { return Real.now() + off; } };
    if (!sessionStorage.getItem('s')) { localStorage.clear(); localStorage.setItem('somasu-tab', JSON.stringify(tab)); localStorage.setItem('somasu-settings', JSON.stringify({bins: ''}));
      if (oldCache) localStorage.setItem('somasu-weather', JSON.stringify({at: Date.now(), data: {daily: {time: ['2026-11-12'], weather_code: [0], temperature_2m_max: [30], temperature_2m_min: [20], precipitation_probability_max: [0], wind_gusts_10m_max: [0]}, hourly: {time: [], precipitation_probability: [], wind_gusts_10m: []}}}));
      sessionStorage.setItem('s', '1'); } }, [now, opts.tab || 'home', !!opts.oldCache]);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && !/ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
  await p.goto('http://localhost:' + srv.address().port + '/'); await p.waitForTimeout(1200);
  return {ctx, p, errs, fetches: () => fetches, asked: () => asked};
}
const open = async p => { await p.click('.tile[data-act=weather]'); await p.waitForTimeout(250); };
const hours = (p, sel) => p.$$eval(sel + ' .wxhr b', x => x.map(e => e.textContent));
srv.listen(0, async () => {
  const b = await chromium.launch();
  try {
    {
      const {p, ctx, errs, asked} = await page(b, '2026-11-12T20:45:00Z');
      ok('asks for 14 days with hourly temperature and sky', /forecast_days=14/.test(asked()) && /hourly=temperature_2m,weather_code/.test(asked()), asked());
      await open(p);
      ok('7 days, then 7 at a glance', await p.locator('.wxdays:not(.later) details.wxd').count() === 7 && await p.locator('.wxdays.later .wxd').count() === 7);
      ok('day names: Today, Tomorrow, Sat 14 … Wed 25', (await p.$$eval('.wxd-n', x => x.map(e => e.textContent))).join('|') === 'Today|Tomorrow|Sat 14|Sun 15|Mon 16|Tue 17|Wed 18|Thu 19|Fri 20|Sat 21|Sun 22|Mon 23|Tue 24|Wed 25');
      ok('after 6pm Tomorrow is open', await p.evaluate(() => [...document.querySelectorAll('details.wxd')].map(d => d.open).join()) === 'false,true,false,false,false,false,false');
      ok('a whole day: every other hour 00:00 to 22:00', (await hours(p, 'details.wxd[open]')).join(' ') === '00:00 02:00 04:00 06:00 08:00 10:00 12:00 14:00 16:00 18:00 20:00 22:00');
      ok('Friday: dry, sunrise and sunset, real numbers', /Sunny\. Dry\. Gusts up to 15 mph\. Sunrise 07:21, sunset 16:18\./.test(await p.textContent('details.wxd[open] .wxd-b p')));
      ok('Friday temperatures 0° to 7°', /0°/.test(await p.textContent('details.wxd[open] .wxd-lo')) && /7°/.test(await p.textContent('details.wxd[open] .wxd-hi')));
      await p.click('details.wxd:nth-child(4) summary'); await p.waitForTimeout(100);
      const sun = 'details.wxd:nth-child(4)';
      ok('tap Sunday: it opens with 12 hours', await p.evaluate(s => document.querySelector(s).open, sun) && (await hours(p, sun)).length === 12);
      ok('Sunday: rain 74%, about 4 mm', /Up to 74% chance of rain, about 4 mm/.test(await p.textContent(sun + ' .wxd-b p')));
      ok('wet hours (50%+) are tinted', await p.locator(sun + ' .wxhr.wet').count() === 6 && /57%/.test(await p.textContent(sun + ' .wxhr.wet')));
      ok('night hours show a moon when clear', /🌙/.test(await p.textContent('details.wxd:nth-child(2) .wxhrs')));
      ok('rain chance shown on the day line only from 20%', /74%/.test(await p.textContent(sun + ' .wxd-r')) && (await p.textContent('details.wxd:nth-child(2) .wxd-r')) === '');
      ok('days 8 to 14 have no hourly detail', await p.locator('.wxdays.later .wxhr, .wxdays.later details').count() === 0);
      ok('a rough-guide note for days 8 to 14', /rough guide/.test(await p.textContent('.sheet')));
      ok('the sheet fits the phone', await p.evaluate(() => { const s = document.querySelector('.sheet'); return s.scrollWidth <= s.clientWidth + 1; }));
      ok('no errors', !errs.length, errs);
      await ctx.close();
    }
    {
      const {p, ctx} = await page(b, '2026-11-12T09:10:00Z');
      await open(p);
      ok('morning: Today open, hours still to come from 08:00', (await hours(p, 'details.wxd[open]')).join(' ') === '08:00 10:00 12:00 14:00 16:00 18:00 20:00 22:00', await hours(p, 'details.wxd[open]'));
      await ctx.close();
    }
    {
      const {p, ctx, fetches} = await page(b, '2026-11-12T09:10:00Z', {oldCache: true});
      ok('an old 3-day forecast on the phone is replaced straight away', fetches() === 1 && !/30°/.test(await p.textContent('.tile[data-act=weather]')));
      await ctx.close();
    }
    {
      const {p, ctx} = await page(b, '2026-11-12T09:10:00Z', {tab: 'calendar'});
      await p.click('[data-act=cal-open]'); await p.click('[data-act=cal-day][data-d="2026-11-24"]'); await p.waitForTimeout(150);
      ok('calendar shows the weather 12 days ahead', /☁️ 8° \/ 0°/.test(await p.textContent('.pwx').catch(() => '')), await p.textContent('.pwx').catch(() => 'none'));
      await ctx.close();
    }
    {
      const {p, ctx} = await page(b, '2026-11-12T20:45:00Z', {width: 320});
      await open(p);
      ok('320px phone: no sideways scroll in the sheet', await p.evaluate(() => { const s = document.querySelector('.sheet'); return s.scrollWidth <= s.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth; }));
      await ctx.close();
    }
    {
      const {p, ctx} = await page(b, '2026-11-12T20:45:00Z', {width: 1280});
      await open(p);
      ok('computer: same sheet, 7 days open-able', await p.locator('details.wxd').count() === 7);
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; }
});
