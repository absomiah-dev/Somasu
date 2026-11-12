// Somasu weather (26 R11): every 30 minutes, read the Met Office warnings for London & South
// East England; every 6 hours, refresh the 2-week heads-ups and the weeks 3 to 6 trend for
// Witney. Results go into the family settings (app_settings: weather_warnings, weather_outlook)
// for the app's dashboard. New warnings, and firm heads-ups (see worthTelling), are sent once
// to every phone with "Weather" notifications on (not between 10pm and 7am: they wait).
import { rest, sendToSubs, env } from '../lib/somasu.mjs';
import { PLACE, MET_REGION, headsUp, trend, parseWarnings, warningText, headsUpText, worthTelling } from '../lib/weather.mjs';

process.env.TZ = 'Europe/London';
const UA = { 'user-agent': 'Somasu family planner (somasu.netlify.app)' };
const ymdNow = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function getJson(url) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try { const r = await fetch(url, { headers: UA, signal: ctl.signal }); if (!r.ok) throw new Error(url.split('?')[0] + ' ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function getText(url) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try { const r = await fetch(url, { headers: UA, signal: ctl.signal, redirect: 'follow' }); if (!r.ok) throw new Error('Met Office ' + r.status); return await r.text(); }
  finally { clearTimeout(t); }
}
async function getSetting(key) {
  const rows = await rest('app_settings?select=value&key=eq.' + key).catch(() => []);
  try { return rows && rows[0] && rows[0].value ? JSON.parse(rows[0].value) : null; } catch (e) { return null; }
}
const putSetting = (key, value) => rest('app_settings', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { key, value: JSON.stringify(value), updated_at: new Date().toISOString() } });

export const quietHours = now => now.getHours() < 7 || now.getHours() >= 22;
const subsFor = async () => (await rest('push_subscriptions?select=id,member_id,endpoint,p256dh,auth,prefs')).filter(s => (s.prefs || {}).weather !== false);

/** One run. Exported with its clock and fetchers so the tests can drive it. */
export async function run(now = new Date()) {
  const result = { warnings: null, outlook: null, sent: 0, errors: [] };
  const sent = (await getSetting('weather_sent')) || { ids: [] };
  const toSend = [];

  // 1. Met Office warnings (every run)
  try {
    const list = parseWarnings(await getText(`https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/${MET_REGION.code}`));
    await putSetting('weather_warnings', { at: now.toISOString(), region: MET_REGION.name, list });
    result.warnings = list.length;
    for (const w of list) if (!sent.ids.includes('warn:' + w.id)) toSend.push({ key: 'warn:' + w.id, msg: warningText(w) });
  } catch (e) { result.errors.push('warnings: ' + e.message); }

  // 2. Outlook (every 6 hours, or when there is none yet)
  const old = await getSetting('weather_outlook');
  if (!old || now - new Date(old.at) >= 6 * 3600000 - 120000) {
    try {
      const q = `latitude=${PLACE.lat}&longitude=${PLACE.lon}&timezone=Europe%2FLondon`;
      const [ens, seas] = await Promise.all([
        getJson(`https://ensemble-api.open-meteo.com/v1/ensemble?${q}&models=ecmwf_ifs025&forecast_days=15&daily=temperature_2m_min,temperature_2m_max,snowfall_sum,wind_gusts_10m_max`),
        getJson(`https://seasonal-api.open-meteo.com/v1/seasonal?${q}&forecast_days=45&daily=temperature_2m_min,temperature_2m_max`).catch(() => null)
      ]);
      const today = ymdNow(now);
      const outlook = { at: now.toISOString(), place: PLACE.name, ahead: headsUp(ens, today), trend: seas ? trend(seas, today) : (old && old.trend) || [] };
      await putSetting('weather_outlook', outlook);
      result.outlook = outlook.ahead.length;
      for (const h of outlook.ahead.filter(worthTelling)) if (!sent.ids.includes('ahead:' + h.kind + ':' + h.from)) toSend.push({ key: 'ahead:' + h.kind + ':' + h.from, msg: headsUpText(h) });
    } catch (e) { result.errors.push('outlook: ' + e.message); }
  }

  // 3. Tell everyone (not overnight: those wait for the 7am run), each thing once.
  if (toSend.length && !quietHours(now) && env('VAPID_PRIVATE_KEY')) {
    const subs = await subsFor();
    for (const t of toSend.slice(0, 3)) { result.sent += (await sendToSubs(subs, t.msg)).sent; sent.ids.push(t.key); }
    sent.ids = sent.ids.slice(-200);
    await putSetting('weather_sent', sent);
  }
  if (result.errors.length) console.warn('weather', result.errors.join('; '));
  return result;
}

export default async () => { await run(new Date()).catch(e => console.error('weather run failed', e)); return new Response('ok'); };
export const config = { schedule: '*/30 * * * *' };
