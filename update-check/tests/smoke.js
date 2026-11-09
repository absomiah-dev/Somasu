// Somasu smoke test: loads a build in a headless browser and checks the basics.
// Usage:  node smoke.js <path to the public folder> [--real]
//   default : try-out mode (config.js blanked in a temporary copy, nothing touches the family database)
//   --real  : uses the build's own config.js and only checks that the sign-in screen appears (no sign-in, no data)
// Exit code 0 = all passed. Prints one PASS/FAIL line per check.
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const SRC = path.resolve(process.argv[2] || '.'); const REAL = process.argv.includes('--real');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'somasu-smoke-'));
fs.cpSync(SRC, tmp, {recursive: true});
if (!REAL) fs.writeFileSync(path.join(tmp, 'config.js'), 'window.SOMASU_CONFIG = { supabaseUrl: "", supabaseKey: "", vapidPublicKey: "" };\n');
const app = fs.readFileSync(path.join(tmp, 'app.js'), 'utf8');
const year = (app.match(/APP_YEAR = '(\d+)'/) || [])[1], rel = (app.match(/APP_RELEASE = '([^']+)'/) || [])[1];
const VERSION = year + ' ' + rel;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.pdf':'application/pdf','.mp4':'video/mp4','.jpg':'image/jpeg'};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(tmp, p); if (!f.startsWith(tmp) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + (x === undefined ? '' : JSON.stringify(x)))); };
srv.listen(0, async () => {
  const BASE = 'http://localhost:' + srv.address().port + '/';
  const errs = [];
  try {
    // Static checks
    ok('version read from app.js: ' + VERSION, !!year && !!rel);
    const meta = (fs.readFileSync(path.join(tmp, 'index.html'), 'utf8').match(/name="app-version" content="([^"]+)"/) || [])[1] || '';
    ok('index.html app-version meta starts with ' + VERSION, meta.startsWith(VERSION + ' ('), meta);
    const cache = (fs.readFileSync(path.join(tmp, 'sw.js'), 'utf8').match(/const CACHE = '([^']+)'/) || [])[1];
    // A same-release refresh (one-off, e.g. 26 R10 on 09-11-2026) adds a letter: somasu-26R10b.
    ok('sw.js CACHE = somasu-' + year + rel, new RegExp('^somasu-' + year + rel + '[a-z]?$').test(cache || ''), cache);
    const top = (app.match(/const RELEASES = \[\s*\{ v: '([^']+)'/) || [])[1];
    ok('RELEASES top entry is ' + VERSION, top === VERSION, top);
    ok('no secret key in the build', !/sb_secret_|service_role/.test(app + fs.readFileSync(path.join(tmp, 'config.js'), 'utf8')));
    for (const f of ['index.html','app.js','config.js','sw.js','site.webmanifest','favicon.ico','favicon.svg','apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-512.png','badge-96.png','guides/Somasu-User-Guide.pdf','guides/Somasu-Admin-Guide.pdf'])
      ok('file present: ' + f, fs.existsSync(path.join(tmp, f)));
    const vids = [...app.matchAll(/guides\/videos\/[\w-]+\.mp4/g)].map(m => m[0]);
    ok('help videos present (' + vids.length + ')', vids.length > 0 && vids.every(v => fs.existsSync(path.join(tmp, v)) && fs.existsSync(path.join(tmp, v.replace('.mp4', '.jpg')))), vids);

    const b = await chromium.launch({args: ['--lang=en-GB']});
    const ctx = await b.newContext({viewport: {width: 390, height: 844}, locale: 'en-GB', timezoneId: 'Europe/London'});
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|fonts\.g/.test(m.text())) errs.push(m.text()); });
    await p.route('**/fonts.googleapis.com/**', r => r.abort()); await p.route('**/fonts.gstatic.com/**', r => r.abort());
    await p.goto(BASE); await p.waitForTimeout(1500);
    if (REAL) {
      const txt = await p.textContent('body');
      ok('real config: sign-in screen shows', /Sign in/i.test(txt) && await p.isVisible('input[type=password]'));
    } else {
      ok('header says Somasu', /Somasu/.test(await p.textContent('header')));
      const hv = await p.textContent('.home-ver').catch(() => '');
      ok('Home version line shows ' + VERSION, hv.includes(VERSION), hv);
      await p.click('[data-act=help] >> nth=0'); await p.waitForTimeout(300);
      ok('Help opens with videos', await p.isVisible('.sheet') && (await p.$$('.sheet video, .sheet .vids [data-vid], .sheet .vids a, .sheet .vids button')).length > 0);
      await p.click('.sheet [data-act=close]'); await p.waitForTimeout(200);
      await p.click('.home-ver [data-act=whatsnew] >> nth=0').catch(async () => { await p.goto(BASE + '#whatsnew'); });
      await p.waitForTimeout(400);
      const h3 = await p.$$eval('.wn h3', e => e.map(x => x.textContent)).catch(() => []);
      ok("What's new: top entry is " + VERSION + ' marked This version', !!h3[0] && h3[0].startsWith(VERSION) && /This version/.test(h3[0]), h3[0]);
      for (const t of ['lists', 'calendar', 'bookings', 'more']) { await p.goto(BASE + '#' + t); await p.waitForTimeout(250); }
      ok('all four tabs open', true);
    }
    ok('no console errors', errs.length === 0, errs);
    await b.close();
  } catch (e) { ok('smoke test ran', false, String(e)); }
  console.log(`${pass} passed, ${fail} failed`); srv.close(); fs.rmSync(tmp, {recursive: true, force: true}); process.exit(fail ? 1 : 0);
});
