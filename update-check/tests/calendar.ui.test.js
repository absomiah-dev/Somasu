// Somasu phone calendar (26 R13): week strip, whole month, day panel, now line, swipes, adding.
// Try-out mode with a fixed clock (Thu 12 Nov 2026, 19:45). Usage: node calendar.ui.test.js <public folder>
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const SRC = path.resolve(process.argv[2] || '.');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'somasu-cal-'));
fs.cpSync(SRC, tmp, {recursive: true});
fs.writeFileSync(path.join(tmp, 'config.js'), 'window.SOMASU_CONFIG = { supabaseUrl: "", supabaseKey: "", vapidPublicKey: "" };\n');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(tmp, p); if (!f.startsWith(tmp) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
function wx() { const days = ['2026-11-12', '2026-11-13', '2026-11-14'], time = [], p = [], g = []; for (const d of days) for (let h = 0; h < 24; h++) { time.push(d + 'T' + String(h).padStart(2, '0') + ':00'); p.push(10); g.push(20); }
  return {daily: {time: days, weather_code: [3, 1, 61], temperature_2m_max: [9, 7, 8], temperature_2m_min: [3, -1, -2], precipitation_probability_max: [20, 10, 60], wind_gusts_10m_max: [30, 30, 30]}, hourly: {time, precipitation_probability: p, wind_gusts_10m: g}}; }
async function page(b, width) {
  const ctx = await b.newContext({viewport: {width, height: 844}, locale: 'en-GB', timezoneId: 'Europe/London', hasTouch: true});
  await ctx.route('**/fonts.googleapis.com/**', r => r.abort());
  await ctx.route('**/api.open-meteo.com/**', r => r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify(wx())}));
  await ctx.addInitScript(() => { const Real = Date, off = new Real('2026-11-12T19:45:00Z') - Real.now();
    window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [Real.now() + off])); } static now() { return Real.now() + off; } };
    if (!sessionStorage.getItem('s')) { localStorage.clear(); localStorage.setItem('somasu-tab', '"calendar"'); localStorage.setItem('somasu-settings', JSON.stringify({bins: JSON.stringify({anchor: '2026-04-02', types: [{name: 'Green bin', what: 'Recycling', colour: '#2E8B57'}, {name: 'Grey bin', what: 'Rubbish', colour: '#5F6B66'}], out: '', moves: [], remind: true})})); sessionStorage.setItem('s', '1'); } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && !/ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
  await p.goto('http://localhost:' + srv.address().port + '/'); await p.waitForTimeout(1200);
  return {ctx, p, errs};
}
const dayTitle = p => p.textContent('.pday-t b');
async function swipe(p, sel, dx) { const bx = await p.locator(sel).first().boundingBox(); const y = bx.y + Math.min(40, bx.height / 2), x = bx.x + bx.width / 2;
  await p.evaluate(([x, y, dx, sel]) => { const el = document.querySelector(sel); const t = (cx) => new Touch({identifier: 1, target: el, clientX: cx, clientY: y});
    el.dispatchEvent(new TouchEvent('touchstart', {touches: [t(x)], changedTouches: [t(x)], bubbles: true}));
    el.dispatchEvent(new TouchEvent('touchend', {touches: [], changedTouches: [t(x + dx)], bubbles: true})); }, [x, y, dx, sel]); await p.waitForTimeout(200); }
srv.listen(0, async () => {
  const b = await chromium.launch();
  try {
    {
      const {p, ctx, errs} = await page(b, 390);
      ok('phone: a week strip, not the month', await p.locator('.pgrid.week .pd').count() === 7 && !(await p.isVisible('.month')));
      ok('today is chosen and marked', /Thursday 12 November/.test(await dayTitle(p)) && /Today/.test(await p.textContent('.pday-t')) && await p.isVisible('.pd.sel.today'));
      ok('the day shows its weather', /9° \/ 3°/.test(await p.textContent('.pwx')));
      ok('bin day as a chip', /Green bin/.test(await p.textContent('.pall')));
      ok('a now line after what has started', await p.isVisible('.nowline') && /Now 19:45/.test(await p.textContent('.nowline')));
      ok('the day’s plans are on screen without scrolling', await p.evaluate(() => { const e = document.querySelector('.pev, .pempty'); return e && e.getBoundingClientRect().top < innerHeight - 160; }));
      ok('Add to today button', /Add to today/.test(await p.textContent('.padd')));
      // next day by arrow, then by swipe
      await p.click('[data-act=day-next]'); await p.waitForTimeout(150);
      ok('next day: Friday 13, Tomorrow, frosty forecast -1°', /Friday 13 November/.test(await dayTitle(p)) && /Tomorrow/.test(await p.textContent('.pday-t')) && /7° \/ -1°/.test(await p.textContent('.pwx')));
      await swipe(p, '.pday', -120);
      ok('swipe left on the day: Saturday 14', /Saturday 14 November/.test(await dayTitle(p)), await dayTitle(p));
      await swipe(p, '.pday', 120); await swipe(p, '.pday', 120);
      ok('swipe right twice: back to Thursday 12', /Thursday 12 November/.test(await dayTitle(p)));
      await swipe(p, '.pcal', -120);
      ok('swipe the week strip: a week on (Thursday 19)', /Thursday 19 November/.test(await dayTitle(p)) && await p.isVisible('[data-d="2026-11-16"]'));
      ok('a small up-and-down move is not a swipe', await (async () => { await p.evaluate(() => { const el = document.querySelector('.pday'); const t = (x, y) => new Touch({identifier: 2, target: el, clientX: x, clientY: y}); el.dispatchEvent(new TouchEvent('touchstart', {touches: [t(200, 300)], changedTouches: [t(200, 300)], bubbles: true})); el.dispatchEvent(new TouchEvent('touchend', {touches: [], changedTouches: [t(140, 420)], bubbles: true})); }); await p.waitForTimeout(150); return /Thursday 19 November/.test(await dayTitle(p)); })());
      await p.click('[data-act=cal-today]'); await p.waitForTimeout(150);
      ok('Today button comes back to today', /Thursday 12 November/.test(await dayTitle(p)));
      // whole month
      await p.click('[data-act=cal-open]'); await p.waitForTimeout(150);
      ok('whole month: 42 days', await p.locator('.pgrid:not(.week) .pd').count() === 42 && /Show one week/.test(await p.textContent('.phandle')));
      await swipe(p, '.pcal', -120);
      ok('swipe the month: December', /December 2026/.test(await p.textContent('.cal-h h1')));
      await swipe(p, '.pcal', 120);
      await p.click('[data-act=cal-day][data-d="2026-11-21"]'); await p.waitForTimeout(150);
      ok('picking a day folds back to its week', /Saturday 21 November/.test(await dayTitle(p)) && await p.locator('.pgrid.week .pd').count() === 7);
      // second tap on the chosen day adds to it
      await p.click('[data-act=cal-day][data-d="2026-11-21"]'); await p.waitForTimeout(200);
      ok('tapping the chosen day again opens Add, for that day', await p.isVisible('form[data-form=event]') && await p.inputValue('form[data-form=event] [name=sd]').catch(() => '') === '2026-11-21');
      await p.click('.sheet [data-act=close]').catch(() => {});
      // empty day
      await p.click('[data-act=day-next]'); await p.waitForTimeout(150);
      const empty = await p.isVisible('.pempty');
      ok('a day with nothing planned says so, with Add', !empty || /Nothing planned/.test(await p.textContent('.pempty')));
      // + button never covers the last plan
      ok('space under the plans for the + button', await p.evaluate(() => parseInt(getComputedStyle(document.querySelector('.pday')).paddingBottom) >= 80));
      ok('no sideways scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      ok('no errors', !errs.length, errs);
      await ctx.close();
    }
    {
      const {p, ctx} = await page(b, 320);
      ok('320px phone: fits, no sideways scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && await p.locator('.pgrid.week .pd').count() === 7);
      await ctx.close();
    }
    {
      const {p, ctx} = await page(b, 1280);
      ok('computer: unchanged month view', await p.isVisible('.month') && !(await p.isVisible('.pcal')));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; }
});
