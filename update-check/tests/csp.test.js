// Somasu security rule (26 R12): only Somasu's own scripts and the Supabase library may run.
// Simulates Netlify injecting its badge (an inline script and an outside script) and checks it is
// blocked, while the app itself runs with no blocked scripts of its own.
// Usage: node csp.test.js <public folder> [--real]   (--real: use the real config.js and Supabase)
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const SRC = path.resolve(process.argv[2] || '.'), REAL = process.argv.includes('--real');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'somasu-csp-'));
fs.cpSync(SRC, tmp, {recursive: true});
if (!REAL) fs.writeFileSync(path.join(tmp, 'config.js'), 'window.SOMASU_CONFIG = { supabaseUrl: "", supabaseKey: "", vapidPublicKey: "" };\n');
// What Netlify does on the free plan: add its badge before </body>.
const html = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
fs.writeFileSync(path.join(tmp, 'index.html'), html.replace('</body>', '<script>window.__badgeInline = true;</script><script src="https://badge.netlify.example/badge.js"></script></body>'));
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(tmp, p); if (!f.startsWith(tmp) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
srv.listen(0, async () => {
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({viewport: {width: 390, height: 844}});
    let badgeAsked = false;
    await ctx.route('**/badge.netlify.example/**', r => { badgeAsked = true; r.fulfill({status: 200, contentType: 'text/javascript', body: 'window.__badgeOutside = true;'}); });
    await ctx.route('**/fonts.googleapis.com/**', r => r.abort());
    await ctx.route('**/api.open-meteo.com/**', r => r.abort());
    const p = await ctx.newPage(); const blocked = [], errs = [];
    p.on('console', m => { const t = m.text(); if (/Content Security Policy/i.test(t)) blocked.push(t.slice(0, 160)); else if (m.type() === 'error' && !/ERR_|Failed to load/.test(t)) errs.push(t); });
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto('http://localhost:' + srv.address().port + '/'); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({inline: !!window.__badgeInline, outside: !!window.__badgeOutside, supabase: !!window.supabase, somasu: !!window.__somasu || !!document.querySelector('.signin, nav.nav')}));
    ok('the security rule is in the page', /Content-Security-Policy/.test(html) && /script-src 'self' https:\/\/cdn\.jsdelivr\.net/.test(html));
    ok('Netlify-style inline badge script blocked', !r.inline, r);
    ok('Netlify-style outside badge script blocked (never even fetched)', !r.outside && !badgeAsked, {r, badgeAsked});
    ok('Supabase library from jsDelivr still loads', r.supabase, r);
    ok('Somasu itself runs', r.somasu, r);
    ok('only the injected scripts were blocked, nothing of Somasu’s', blocked.length >= 1 && blocked.every(t => /inline|badge\.netlify\.example/.test(t) || /script-src/.test(t)) && blocked.length <= 3, blocked);
    ok('no other errors', !errs.length, errs);
    {
      // the offline screen's Try again button (was an inline onclick): real config, library blocked
    }
    if (!REAL) {
      await p.click('nav.nav [data-tab=lists]'); await p.fill('#newItem', 'Bread'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
      ok('lists still work (adding an item)', await p.evaluate(() => window.__somasu.S.items.some(i => i.text === 'Bread')));
      await p.click('nav.nav [data-tab=home]'); await p.click('.tile[data-act=weather]').catch(() => {}); await p.waitForTimeout(300);
      ok('weather sheet still opens', await p.isVisible('.sheet'));
      // the offline screen's Try again button (was an inline onclick)
      const q = await ctx.newPage(); await q.route('**/cdn.jsdelivr.net/**', rr => rr.abort());
      let reloaded = 0; q.on('load', () => reloaded++);
      await q.goto('http://localhost:' + srv.address().port + '/'); await q.waitForTimeout(800);
      const txt = await q.textContent('#app');
      if (/offline|Can’t reach/i.test(txt)) { await q.click('#retry'); await q.waitForTimeout(800); ok('Try again button works under the rule', reloaded >= 2, {reloaded}); }
      else ok('Try again screen shown when the library can’t load (try-out mode does not need it)', true);
    }
  } finally { await b.close(); srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; }
});
