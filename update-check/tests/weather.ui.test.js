// Somasu weather warnings and look-ahead on Home (26 R11), try-out mode, fixed clock, mocked forecast.
// Usage: node weather.ui.test.js <public folder>
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const SRC = path.resolve(process.argv[2] || '.');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'somasu-wx-'));
fs.cpSync(SRC, tmp, {recursive: true});
fs.writeFileSync(path.join(tmp, 'config.js'), 'window.SOMASU_CONFIG = { supabaseUrl: "", supabaseKey: "", vapidPublicKey: "" };\n');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(tmp, p); if (!f.startsWith(tmp) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
function wx() { const days = ['2026-11-12', '2026-11-13', '2026-11-14'], time = [], p = [], g = []; for (const d of days) for (let h = 0; h < 24; h++) { time.push(d + 'T' + String(h).padStart(2, '0') + ':00'); p.push(10); g.push(20); }
  return {daily: {time: days, weather_code: [1, 1, 1], temperature_2m_max: [8, 7, 7], temperature_2m_min: [1, -1, -2], precipitation_probability_max: [10, 10, 10], wind_gusts_10m_max: [30, 30, 30]}, hourly: {time, precipitation_probability: p, wind_gusts_10m: g}}; }
const NOW = '2026-11-12T08:00:00Z';
const WARN = {at: NOW, region: 'London & South East England', list: [{id: 'abc', title: 'Yellow warning of snow, ice affecting London & South East England', link: 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings#?id=abc', text: 'Yellow warning of snow, ice affecting London & South East England: valid from 0300 Fri 20 Nov to 1200 Fri 20 Nov', level: 'yellow', type: 'snow, ice'}]};
const OUT = {at: NOW, place: 'Witney', ahead: [
  {kind: 'frost', icon: '🌡️', label: 'Frosty night', quiet: true, from: '2026-11-13', to: '2026-11-14', days: 2, agree: 0.98, why: 'around -1°C overnight', when: 'Fri 13 Nov to Sat 14 Nov', sure: 'almost all'},
  {kind: 'hard-frost', icon: '❄️', label: 'Hard frost', from: '2026-11-18', to: '2026-11-19', days: 2, agree: 0.75, why: 'down to about -5°C', when: 'Wed 18 Nov to Thu 19 Nov', sure: '3 in 4'}],
  trend: [{week: 'Thu 26 Nov', text: 'A frost or two possible', frost: 17, hard: 0, nights: 3, days: 7}, {week: 'Thu 17 Dec', text: 'Some frosty nights', frost: 36, hard: 12, nights: 2, days: 6}]};
async function page(b, settings, hash = '') {
  const ctx = await b.newContext({viewport: {width: 390, height: 844}, locale: 'en-GB', timezoneId: 'Europe/London'});
  await ctx.route('**/fonts.googleapis.com/**', r => r.abort());
  await ctx.route('**/api.open-meteo.com/**', r => r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify(wx())}));
  await ctx.addInitScript(([now, st]) => { const Real = Date, off = new Real(now) - Real.now();
    window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [Real.now() + off])); } static now() { return Real.now() + off; } };
    if (!sessionStorage.getItem('s')) { localStorage.clear(); localStorage.setItem('somasu-settings', JSON.stringify(st)); sessionStorage.setItem('s', '1'); } }, [NOW, settings]);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && !/ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
  await p.goto('http://localhost:' + srv.address().port + '/' + hash); await p.waitForTimeout(1200);
  return {ctx, p, errs};
}
srv.listen(0, async () => {
  const b = await chromium.launch();
  try {
    {
      const {p, ctx, errs} = await page(b, {bins: '', weather_warnings: JSON.stringify(WARN), weather_outlook: JSON.stringify(OUT)});
      const tile = await p.evaluate(() => { const t = document.querySelector('.tile[data-act=weather]'); return t && {hot: t.classList.contains('hot'), text: t.innerText.replace(/\s+/g, ' ')}; });
      ok('weather tile turns gold with the warning', tile && tile.hot && /Yellow warning: snow, ice/.test(tile.text), tile);
      const att = await p.evaluate(() => [...document.querySelectorAll('.dash .att')].map(a => a.innerText.replace(/\s+/g, ' ')));
      ok('needs attention: the warning and the hard frost heads-up', att.some(a => /Yellow weather warning: snow, ice/.test(a)) && att.some(a => /Heads-up: hard frosts Wed 18 Nov to Thu 19 Nov/.test(a) && /3 in 4 forecasts agree/.test(a)), att);
      ok('frosty nights tomorrow are not in Needs attention', !att.some(a => /Frosty/i.test(a)), att);
      await p.click('.tile[data-act=weather]'); await p.waitForTimeout(200);
      const sheet = await p.textContent('.sheet');
      ok('sheet: Met Office warning with a link to the full warning', /Met Office warnings/.test(sheet) && await p.isVisible('.sheet a[href^="https://www.metoffice.gov.uk/"]'), sheet.slice(0, 200));
      ok('sheet: next two weeks (frosty nights, hard frosts)', /Frosty nights · Fri 13 Nov to Sat 14 Nov/.test(sheet) && /Hard frosts · Wed 18 Nov to Thu 19 Nov/.test(sheet), sheet);
      ok('sheet: weeks 3 to 6 trend, with a hard-frost chance', /Weeks 3 to 6/.test(sheet) && /Week of Thu 17 Dec: some frosty nights/.test(sheet) && /1 in 10 chance of a hard frost/.test(sheet), sheet);
      ok('sheet: credits the Met Office and Open-Meteo', /Warnings: Met Office/.test(sheet) && /Open-Meteo/.test(sheet));
      ok('no errors', !errs.length, errs);
      await ctx.close();
    }
    {
      const {p, ctx} = await page(b, {bins: '', weather_outlook: JSON.stringify(Object.assign({}, OUT, {ahead: [OUT.ahead[0]]}))});
      const tile = await p.evaluate(() => document.querySelector('.tile[data-act=weather]').innerText.replace(/\s+/g, ' '));
      ok('no warning: tile shows the frost tomorrow', /Frosty nights Fri 13/.test(tile), tile);
      ok('no warning: no warning section in the sheet', await (async () => { await p.click('.tile[data-act=weather]'); await p.waitForTimeout(200); return !/Met Office warnings/.test(await p.textContent('.sheet')); })());
      await ctx.close();
    }
    {
      const {p, ctx} = await page(b, {bins: '', weather_outlook: JSON.stringify(OUT)}, '#weather');
      ok('notification link #weather opens the weather sheet on Home', await p.isVisible('.sheet .wxh') && /Today in Witney/.test(await p.textContent('.sheet h2')));
      await ctx.close();
    }
    {
      const old = Object.assign({}, WARN, {at: '2026-11-11T08:00:00Z'});
      const {p, ctx} = await page(b, {bins: '', weather_warnings: JSON.stringify(old), weather_outlook: JSON.stringify(OUT)});
      ok('a warning list older than 6 hours is not shown (server not updating)', !(await p.evaluate(() => document.querySelector('.tile[data-act=weather]').classList.contains('hot'))));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; }
});
