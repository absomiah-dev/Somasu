// Somasu barcode scanner test (26 R9): camera scan, typed number, Open Food Facts lookup, aisles,
// Compare prices, camera refused. Try-out mode (no family data). Chromium's fake camera plays a
// video of a printed barcode; Open Food Facts is mocked unless --real is given.
// Usage: node scan.test.js <public folder> <folder with beanz.png> [--real]   (needs ffmpeg the first time, to turn
// beanz.png into the fake camera video beanz.y4m)
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const SRC = path.resolve(process.argv[2] || '.'), MEDIA = path.resolve(process.argv[3] || '.'), REAL = process.argv.includes('--real');
if (!fs.existsSync(path.join(MEDIA, 'beanz.y4m'))) require('child_process').execFileSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-i', path.join(MEDIA, 'beanz.png'), '-t', '4', '-vf', 'scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2:color=0x302820,format=yuv420p', '-r', '15', path.join(MEDIA, 'beanz.y4m')]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'somasu-scan-'));
fs.cpSync(SRC, tmp, {recursive: true});
fs.writeFileSync(path.join(tmp, 'config.js'), 'window.SOMASU_CONFIG = { supabaseUrl: "", supabaseKey: "", vapidPublicKey: "" };\n');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(tmp, p); if (!f.startsWith(tmp) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const BEANZ = {code: '5000157024671', status: 1, product: {product_name: 'Beanz in a rich tomato sauce', brands: 'Heinz,H J Heinz Foods UK Ltd', quantity: '415g',
  categories_tags: ['en:plant-based-foods-and-beverages', 'en:plant-based-foods', 'en:canned-foods', 'en:canned-plant-based-foods', 'en:baked-beans-in-tomato-sauce', 'en:canned-common-beans']}};

async function page(b, video, opts = {}) {
  const ctx = await b.newContext({viewport: {width: 390, height: 844}, locale: 'en-GB', timezoneId: 'Europe/London', permissions: opts.noCamera ? [] : ['camera']});
  const seen = [];
  if (!REAL) await ctx.route(u => u.hostname.endsWith('openfoodfacts.org'), r => { const u = r.request().url(); seen.push(u);
    if (opts.offDown) return r.abort();
    if (u.includes('/5000157024671.json')) return r.fulfill({status: 200, headers: {'access-control-allow-origin': '*', 'content-type': 'application/json'}, body: JSON.stringify(BEANZ)});
    return r.fulfill({status: 404, headers: {'access-control-allow-origin': '*', 'content-type': 'application/json'}, body: '{"status":0,"status_verbose":"product not found"}'}); });
  await ctx.route('**/fonts.googleapis.com/**', r => r.abort());
  if (opts.noCamera) await ctx.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('denied'), {name: 'NotAllowedError'})); });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && !/ERR_|Failed to load/.test(m.text()) && errs.push(m.text()));
  await p.goto('http://localhost:' + srv.address().port + '/'); await p.waitForTimeout(1200);
  await p.click('nav.nav [data-tab=lists]'); await p.waitForTimeout(300);
  return {ctx, p, errs, seen};
}

srv.listen(0, async () => {
  const launch = video => chromium.launch({args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + path.join(MEDIA, video)]});
  let b = await launch('beanz.y4m');
  try {
    // ---- pure functions
    {
      const {p, ctx} = await page(b);
      const r2 = await p.evaluate((tags) => { const {validBarcode, offAisle} = window.__somasu; return {
        v: ['5000157024671', '50001576', '036000291452', '5000157024672', '12345', 'abcdefghijklm'].map(validBarcode),
        a: [
          [['en:dairies', 'en:milks-liquid-and-powder', 'en:milks', 'en:semi-skimmed-milks'], 'Semi skimmed milk'],
          [['en:beverages-and-beverages-preparations', 'en:beverages', 'en:carbonated-drinks', 'en:sodas', 'en:colas'], 'Coca-Cola'],
          [['en:plant-based-foods-and-beverages', 'en:cereals-and-potatoes', 'en:breads', 'en:white-breads'], 'White bread'],
          [['en:plant-based-foods-and-beverages', 'en:snacks', 'en:salty-snacks', 'en:potato-crisps-in-sunflower-oil'], 'Walkers Ready Salted'],
          [['en:dairies', 'en:cheeses', 'en:cheeses-from-england', 'en:cheddar-cheese'], 'Mature Cheddar'],
          [tags, 'Beanz'],
          [['en:frozen-foods', 'en:frozen-vegetables', 'en:peas'], 'Garden peas'],
          [[], 'Original Washing Up Liquid'],
          [[], 'Something odd']
        ].map(([t, n]) => offAisle(t, n))
      }; }, BEANZ.product.categories_tags);
      ok('barcode check digits: good ones pass, bad ones fail', JSON.stringify(r2.v) === '[true,true,true,false,false,false]', r2.v);
      ok('aisles from Open Food Facts', JSON.stringify(r2.a) === JSON.stringify(['Dairy & eggs', 'Drinks', 'Bakery', 'Cupboard', 'Dairy & eggs', 'Cupboard', 'Frozen', 'Household', 'Other']), r2.a);
      await ctx.close();
    }
    // ---- camera scan, found
    {
      const {p, ctx, errs, seen} = await page(b);
      ok('shopping list has a Scan button', await p.isVisible('.addbar [data-act=scan]'));
      await p.click('.addbar [data-act=scan]');
      await p.waitForSelector('.sheet h2:has-text("Add to list")', {timeout: 15000}).catch(() => {});
      const title = await p.textContent('.sheet h2').catch(() => '');
      ok('camera reads the barcode and looks it up', /Add to list/.test(title), title);
      ok('only the barcode number is sent', REAL || (seen.length === 1 && /\/api\/v2\/product\/5000157024671\.json/.test(seen[0])), seen);
      const v = await p.evaluate(() => ({t: document.querySelector('#scT').value, n: document.querySelector('#scN').value, c: document.querySelector('.sheet select[name=category]').value,
        cmp: (document.querySelector('.sheet a[href*="trolley.co.uk"]') || {}).href, cam: !!(window.__scanStream), live: [...document.querySelectorAll('video')].some(x => x.srcObject && x.srcObject.active)}));
      ok('name, brand and size filled in', REAL ? !!v.t : (v.t === 'Beanz in a rich tomato sauce' && v.n === 'Heinz · 415g'), v);
      ok('aisle chosen from the category (Cupboard)', v.c === 'Cupboard', v.c);
      ok('Compare prices opens Trolley for this product', v.cmp && v.cmp.startsWith('https://www.trolley.co.uk/search/?q=') && /Beanz/.test(decodeURIComponent(v.cmp)), v.cmp);
      ok('camera switched off after the scan', !v.live, v);
      await p.mouse.move(2, 2); await p.screenshot({path: path.join(MEDIA, 'scan-result.png')});
      await p.click('form[data-form=scan-add] [type=submit]'); await p.waitForTimeout(500);
      const row = await p.evaluate(() => { const {S} = window.__somasu; const i = S.items.find(x => /Beanz/.test(x.text)); return i && {cat: i.category, note: i.note}; });
      ok('added to the list in the Cupboard aisle with the note', row && row.cat === 'Cupboard' && (REAL || row.note === 'Heinz · 415g'), row);
      ok('Beanz shows under Cupboard on the list', await p.evaluate(() => { const c = [...document.querySelectorAll('.card .cat')].find(x => x.textContent === 'Cupboard'); let n = c && c.nextElementSibling, ok = false; while (n && !n.classList.contains('cat')) { if (/Beanz/.test(n.textContent)) ok = true; n = n.nextElementSibling; } return ok; }));
      // scanning it again: already on the list
      await p.click('.addbar [data-act=scan]'); await p.waitForSelector('.sheet h2:has-text("Add to list")', {timeout: 15000});
      await p.click('form[data-form=scan-add] [type=submit]'); await p.waitForTimeout(400);
      ok('scanning something already on the list says so', /already on the list/.test(await p.textContent('.toast').catch(() => '')));
      await p.click('.sheet [data-act=close]');
      // item form has Compare prices
      await p.click('.item .txt >> nth=0'); await p.waitForTimeout(200);
      ok('Edit item on a shopping list has Compare prices', await p.isVisible('.sheet a[href*="trolley.co.uk"]'));
      await p.click('.sheet [data-act=close]');
      // closing the scanner turns the camera off
      await p.click('.addbar [data-act=scan]'); await p.waitForTimeout(700);
      await p.click('.sheet [data-act=close]'); await p.waitForTimeout(200);
      ok('closing the scanner turns the camera off', await p.evaluate(() => ![...document.querySelectorAll('video')].some(x => x.srcObject && x.srcObject.active)));
      ok('no errors', !errs.length, errs);
      await ctx.close();
    }
    // ---- typed number, not found; database down; bad number (camera shows Chromium's test pattern, no barcode)
    const b2 = await chromium.launch({args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']});
    {
      const {p, ctx, errs} = await page(b2);
      await p.click('.addbar [data-act=scan]'); await p.click('.sheet [data-act=close]'); // nothing scanned
      await p.click('.addbar [data-act=scan]');
      await p.fill('#scanCode', '123'); await p.click('form[data-form=scan-code] [type=submit]'); await p.waitForTimeout(200);
      ok('a wrong number is refused with a plain message', /8 or 13 digits/.test(await p.textContent('.sheet .err')));
      await p.fill('#scanCode', '5098765432100'); await p.click('form[data-form=scan-code] [type=submit]');
      await p.waitForSelector('.sheet h2:has-text("Not found")', {timeout: 8000}).catch(() => {});
      ok('unknown product: Not found, type the name', /isn’t in Open Food Facts/.test(await p.textContent('.sheet').catch(() => '')));
      await p.fill('#scT', 'Kenkey'); await p.click('form[data-form=scan-add] [type=submit]'); await p.waitForTimeout(400);
      ok('typed name still added', await p.evaluate(() => window.__somasu.S.items.some(i => i.text === 'Kenkey')));
      ok('no errors', !errs.length, errs);
      await ctx.close();
    }
    if (!REAL) {
      const {p, ctx} = await page(b2, null, {offDown: true});
      await p.click('.addbar [data-act=scan]'); await p.fill('#scanCode', '5000157024671'); await p.click('form[data-form=scan-code] [type=submit]');
      await p.waitForSelector('.sheet h2:has-text("Not found")', {timeout: 12000}).catch(() => {});
      ok('database unreachable: says so, can still type the name', /couldn’t be reached/.test(await p.textContent('.sheet').catch(() => '')));
      await ctx.close();
    }
    await b2.close();
    // ---- camera refused
    {
      const {p, ctx, errs} = await page(b, null, {noCamera: true});
      await p.click('.addbar [data-act=scan]'); await p.waitForTimeout(500);
      ok('camera refused: plain message, typing still works', /Camera access is off/.test(await p.textContent('#scanMsg')) && await p.isVisible('#scanCode') && !(await p.isVisible('.scanbox')));
      await p.screenshot({path: path.join(MEDIA, 'scan-refused.png')});
      ok('no errors', !errs.length, errs);
      await ctx.close();
    }
    // ---- phones with a built-in barcode reader (Android) use it
    {
      const {p, ctx} = await page(b);
      await p.evaluate(() => { window.BarcodeDetector = class { static async getSupportedFormats() { return ['ean_13', 'qr_code']; } constructor(o) { window.__bdFormats = o.formats; } async detect() { return [{rawValue: '5000157024671'}]; } }; });
      await p.click('.addbar [data-act=scan]');
      await p.waitForSelector('.sheet h2:has-text("Add to list")', {timeout: 8000}).catch(() => {});
      const r = await p.evaluate(() => ({f: window.__bdFormats, z: !!window.ZXing}));
      ok('built-in reader used when the phone has one (no ZXing download)', JSON.stringify(r.f) === '["ean_13"]' && !r.z, r);
      await ctx.close();
    }
    // ---- other list types have no scan button
    {
      const {p, ctx} = await page(b);
      const todo = await p.evaluate(() => { const {S} = window.__somasu; const l = S.lists.find(x => x.kind === 'todo'); return l && l.id; });
      if (todo) { await p.click(`.chip[data-id="${todo}"]`); await p.waitForTimeout(200); }
      ok('to-do lists have no Scan button', !!todo && !(await p.isVisible('.addbar [data-act=scan]')));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0; }
});
