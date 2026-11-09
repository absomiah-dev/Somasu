// Somasu calendar merge test: duplicate events across linked calendars show once with everyone's faces.
// Usage: node merge.test.js <path to the public folder>   (try-out mode, no family data touched)
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const SRC = path.resolve(process.argv[2] || '.');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'somasu-merge-'));
fs.cpSync(SRC, tmp, {recursive: true});
fs.writeFileSync(path.join(tmp, 'config.js'), 'window.SOMASU_CONFIG = { supabaseUrl: "", supabaseKey: "", vapidPublicKey: "" };\n');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(tmp, p); if (!f.startsWith(tmp) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
let pass = 0, fail = 0; const ok = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
srv.listen(0, async () => {
  const b = await chromium.launch(); const errs = [];
  try {
    const p = await b.newPage({viewport: {width: 390, height: 844}, locale: 'en-GB', timezoneId: 'Europe/London'});
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && !/status of 429|ERR_FAILED/.test(m.text()) && errs.push(m.text())); // the weather tile's free forecast can say 'too busy' to shared cloud machines
    await p.goto('http://localhost:' + srv.address().port + '/'); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const { S, parseICS, eventsBetween, normTitle, calOwners, render } = window.__somasu;
      const [a, c2, c3] = S.members; const d = new Date(); d.setDate(d.getDate() + 1);
      const z = (h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
      const ics = evs => 'BEGIN:VCALENDAR\r\n' + evs.map(([uid, t, s, e]) => `BEGIN:VEVENT\r\nUID:${uid}\r\nSUMMARY:${t}\r\nDTSTART:${s}\r\nDTEND:${e}\r\nEND:VEVENT\r\n`).join('') + 'END:VCALENDAR\r\n';
      const cal = (id, name, by) => ({ id, name, url: 'https://example.org/' + id + '.ics', colour: '#5567D6', visible: true, created_by: by.id });
      S.calendars = [cal('g1', 'Google', a), cal('o1', 'Outlook', c2), cal('s1', 'School', c3 || a)];
      S.external = {
        g1: parseICS(ics([['inv-1', 'Parents evening', z(18, 0), z(19, 0)], ['x-1', 'Football', z(10, 0), z(11, 0)], ['x-2', 'Swim', z(15, 0), z(16, 0)]])),
        o1: parseICS(ics([['inv-1', 'Parents Evening (school)', z(18, 0), z(19, 0)], ['y-1', '  football ', z(10, 0), z(11, 0)], ['y-2', 'Swimming lesson', z(15, 0), z(16, 0)]])),
        s1: parseICS(ics([['inv-1', 'Parents evening', z(18, 0), z(19, 0)]]))
      };
      const from = new Date(d); from.setHours(0, 0, 0, 0); const to = new Date(from); to.setDate(to.getDate() + 1);
      const evs = eventsBetween(from, to).filter(e => e.kind === 'linked');
      const by = t => evs.filter(e => normTitle(e.title).startsWith(t));
      S.tab = 'home'; render();
      return { total: evs.length, parents: by('parents').map(e => e.cals.length), football: by('football').map(e => e.cals.length), swim: by('swim').map(e => e.cals.length), owners: by('parents')[0] && new Set(calOwners(by('parents')[0])).size, members: S.members.length };
    });
    ok('same UID in 3 calendars shows once, in 3 calendars', JSON.stringify(r.parents) === '[3]', r);
    ok('same title (case/spaces) and time shows once, in 2 calendars', JSON.stringify(r.football) === '[2]', r);
    ok('near-matches stay separate (Swim / Swimming lesson)', JSON.stringify(r.swim) === '[1,1]', r);
    ok('4 linked rows in total (6 copies merged)', r.total === 4, r);
    await p.waitForTimeout(500);
    const ui = await p.evaluate(() => document.querySelectorAll('.row .av-stack').length);
    ok('Home shows avatar stacks for merged events', ui >= 2, ui);
    await p.screenshot({path: path.join(os.tmpdir(), 'somasu-merge-home.png'), fullPage: true});
    await p.evaluate(() => { const { S, render } = window.__somasu; S.tab = 'calendar'; S.calView = 'agenda'; render(); }); await p.waitForTimeout(300);
    const ag = await p.evaluate(() => ({ stacks: document.querySelectorAll('button.ev .av-stack').length, src: [...document.querySelectorAll('button.ev .src')].map(x => x.textContent) }));
    ok('Agenda shows avatars and "3 calendars" for merged events', ag.stacks >= 2 && ag.src.includes('3 calendars'), ag);
    await p.screenshot({path: path.join(os.tmpdir(), 'somasu-merge-agenda.png'), fullPage: true});
    await p.locator('button.ev', {hasText: 'Parents evening'}).first().click(); await p.waitForTimeout(400);
    const modal = await p.evaluate(() => document.body.innerText);
    ok('detail shows "In 3 calendars" and each source', /In 3 calendars/.test(modal) && /Google/.test(modal) && /Outlook/.test(modal) && /School/.test(modal), modal.slice(0, 300));
    await p.screenshot({path: path.join(os.tmpdir(), 'somasu-merge-modal.png')});
    const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok('no sideways scroll at 390px', sw <= 390, sw);
    ok('no console errors', errs.length === 0, errs);
  } catch (e) { ok('test ran', false, String(e)); }
  await b.close(); srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
});
