// Somasu bin day and At a glance tiles (26 R10), in try-out mode with a fixed clock.
// Usage: node bins.ui.test.js <public folder>
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const SRC = path.resolve(process.argv[2] || '.');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'somasu-bins-'));
fs.cpSync(SRC, tmp, {recursive: true});
fs.writeFileSync(path.join(tmp, 'config.js'), 'window.SOMASU_CONFIG = { supabaseUrl: "", supabaseKey: "", vapidPublicKey: "" };\n');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(tmp, p); if (!f.startsWith(tmp) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const CFG = { anchor: '2026-04-02', types: [{ name: 'Green bin', what: 'Recycling, food waste, garden waste', colour: '#2E8B57' }, { name: 'Grey bin', what: 'Rubbish, food waste', colour: '#5F6B66' }], out: 'Out by 6am', moves: [], until: '2027-04-01', source: 'https://westoxon.gov.uk/bins-and-recycling/waste-calendars/thu1/', remind: true };

async function page(b, nowIso, cfg) {
  const ctx = await b.newContext({viewport: {width: 390, height: 844}, locale: 'en-GB', timezoneId: 'Europe/London'});
  await ctx.route('**/fonts.googleapis.com/**', r => r.abort());
  await ctx.addInitScript(([now, cfg]) => {
    const Real = Date, off = new Real(now) - Real.now();
    window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [Real.now() + off])); } static now() { return Real.now() + off; } };
    if (!sessionStorage.getItem('seeded')) { localStorage.clear(); if (cfg !== undefined) localStorage.setItem('somasu-settings', JSON.stringify(cfg === null ? {bins: ''} : {bins: JSON.stringify(cfg)})); sessionStorage.setItem('seeded', '1'); }
  }, [nowIso, cfg]);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && !/ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
  await p.goto('http://localhost:' + srv.address().port + '/'); await p.waitForTimeout(1000);
  return {ctx, p, errs};
}
const tileText = p => p.evaluate(() => [...document.querySelectorAll('.glance .tile')].map(t => t.innerText.replace(/\s+/g, ' ').trim()));

srv.listen(0, async () => {
  const b = await chromium.launch();
  try {
    // Wednesday 11 Nov 2026, 8pm: green bin tomorrow
    {
      const {p, ctx, errs} = await page(b, '2026-11-11T20:00:00Z', CFG);
      const t = await tileText(p);
      ok('four At a glance tiles', t.length === 4, t);
      ok('bin tile: Green bin, put it out tonight', /BIN DAY Green bin Put it out tonight/i.test(t[0]) && await p.isVisible('.tile.hot'), t[0]);
      ok('today, shopping and car tiles', /TODAY/i.test(t[1]) && /SHOPPING .*to get/i.test(t[2]) && /FAMILY CAR/i.test(t[3]), t);
      await p.click('.tile[data-act=bins]');
      const rows = await p.evaluate(() => [...document.querySelectorAll('.sheet .row .t')].map(x => x.textContent));
      ok('bin sheet lists the next 8 weeks, alternating', rows.length === 8 && rows[0] === 'Green bin' && rows[1] === 'Grey bin' && rows[2] === 'Green bin', rows);
      ok('bin sheet links to the council calendar', await p.isVisible('.sheet a[href*="westoxon.gov.uk"]'));
      await p.click('.sheet [data-act=close]');
      // calendar shows bins, and the Bins chip hides them
      await p.click('nav.nav [data-tab=calendar]'); await p.waitForTimeout(200);
      await p.click('[data-act=cal-day][data-d="2026-11-12"]'); await p.waitForTimeout(150);
      ok('calendar: Green bin on Thu 12 Nov', await p.evaluate(() => [...document.querySelectorAll('.agenda-day .ev .t')].some(x => x.textContent === 'Green bin')));
      ok('calendar: Grey bin on Thu 19 Nov', await p.evaluate(() => [...document.querySelectorAll('[data-d="2026-11-19"] .lbl')].some(x => /Grey bin/.test(x.textContent))));
      await p.click('[data-act=filter][data-key=bins]'); await p.waitForTimeout(150);
      ok('Bins chip hides them', await p.evaluate(() => ![...document.querySelectorAll('.agenda-day .ev .t')].some(x => x.textContent === 'Green bin')));
      await p.click('[data-act=filter][data-key=bins]'); await p.waitForTimeout(150);
      ok('no errors', !errs.length, errs);
      await ctx.close();
    }
    // Thursday 12 Nov 7am: today. Thursday 12 Nov 1pm: next is grey on the 19th
    {
      const {p, ctx} = await page(b, '2026-11-12T07:00:00Z', CFG);
      ok('collection day morning: Today · Out by 6am', /Green bin Today · Out by 6am/.test((await tileText(p))[0]), (await tileText(p))[0]);
      await ctx.close();
      const q = await page(b, '2026-11-12T13:00:00Z', CFG);
      ok('after midday: next is Grey bin, Thu 19 Nov', /Grey bin Thu 19 Nov/.test((await tileText(q.p))[0]), (await tileText(q.p))[0]);
      await q.ctx.close();
    }
    // a moved collection shows as moved
    {
      const {p, ctx} = await page(b, '2026-12-22T10:00:00Z', Object.assign({}, CFG, {moves: [{from: '2026-12-24', to: '2026-12-27'}]}));
      ok('moved collection: Sun 27 Dec · moved', /Green bin Sun 27 Dec · moved/.test((await tileText(p))[0]), (await tileText(p))[0]);
      await ctx.close();
    }
    // admin sets bin day up from scratch, giving a week 2 date
    {
      const {p, ctx, errs} = await page(b, '2026-11-09T19:00:00Z', null);
      const t = await tileText(p);
      ok('not set up: admin sees Set it up', /BIN DAY Set it up/i.test(t[0]), t);
      await p.click('.tile[data-act=edit-bins]');
      await p.fill('#bA', '2026-11-19'); await p.selectOption('select[name=first]', '1');
      await p.fill('[name=n0]', 'Green bin'); await p.fill('[name=w0]', 'Recycling, food waste, garden waste');
      await p.fill('[name=n1]', 'Grey bin'); await p.selectOption('select[name=c1]', '#5F6B66'); await p.fill('[name=w1]', 'Rubbish, food waste');
      await p.fill('#bO', 'Out by 6am');
      await p.fill('#bM', '24-12-2026 > tomorrow'); await p.click('form[data-form=bins] [type=submit]'); await p.waitForTimeout(150);
      ok('a changed date it can’t read is explained', /Couldn’t read/.test(await p.textContent('.sheet .err')));
      await p.fill('#bM', '24-12-2026 > 27-12-2026\n31/12/2026 > none'); await p.fill('#bS', 'https://westoxon.gov.uk/bins-and-recycling/waste-calendars/thu1/');
      await p.click('form[data-form=bins] [type=submit]'); await p.waitForTimeout(300);
      const saved = await p.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('somasu-settings')).bins));
      ok('saved: a week 2 date becomes the week 1 anchor a week earlier', saved.anchor === '2026-11-12' && saved.types.length === 2 && saved.types[1].colour === '#5F6B66', saved);
      ok('saved: moves read in either date style', JSON.stringify(saved.moves) === JSON.stringify([{from: '2026-12-24', to: '2026-12-27'}, {from: '2026-12-31', to: ''}]), saved.moves);
      ok('toast says what’s next', /Saved\. Next: Green bin/.test(await p.textContent('.toast')), await p.textContent('.toast'));
      const rule = await p.evaluate(() => { const {binCollections, binsCfg} = window.__somasu; return binCollections(binsCfg(), new Date(2026, 3, 1), new Date(2027, 3, 2)).map(x => x.date.getDate() + '/' + (x.date.getMonth() + 1) + ' ' + x.type.name[1]); });
      ok('same rule as the council year (green 12/11, grey 19/11, 27/12 moved, 31/12 none)', rule.includes('12/11 r') && rule.includes('19/11 r') && rule.includes('27/12 r') && !rule.includes('31/12 r') && rule.includes('2/4 r') && rule[0] === '2/4 r', rule.slice(0, 3));
      ok('Family page shows next bin', /Next: Green bin/.test(await (async () => { await p.click('nav.nav [data-tab=more]'); await p.waitForTimeout(200); return p.textContent('main'); })()));
      // turn off
      p.once('dialog', d => d.accept());
      await p.click('[data-act=edit-bins]'); await p.click('[data-act=clear-bins]'); await p.waitForTimeout(300);
      ok('turn off: bins gone', await p.evaluate(() => !window.__somasu.binsCfg()));
      ok('no errors', !errs.length, errs);
      await ctx.close();
    }
    // phone width: tiles fit, no sideways scroll
    {
      const {p, ctx} = await page(b, '2026-11-11T20:00:00Z', CFG);
      await p.setViewportSize({width: 320, height: 700}); await p.waitForTimeout(200);
      ok('320px wide: no sideways scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; }
});
