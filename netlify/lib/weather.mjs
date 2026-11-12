// Somasu weather outlook and warnings (26 R11). Pure functions, no network: the scheduled
// function netlify/functions/weather.mjs fetches the data and stores the results in the family
// settings (app_settings rows "weather_outlook" and "weather_warnings") for the app to show.
//
// Sources, all free and meant to be used this way:
//  - Met Office warnings RSS for London & South East England (Oxfordshire is in this region).
//    Terms: link each warning to the full Met Office page and credit the Met Office.
//  - Open-Meteo ensemble forecast (ECMWF, 51 runs, 15 days): what most runs agree on.
//  - Open-Meteo seasonal forecast (ECMWF, 51 runs, 45 days): weeks 3 to 6 as a trend only.

export const PLACE = { name: 'Witney', lat: 51.785, lon: -1.485 };
export const MET_REGION = { code: 'se', name: 'London & South East England' };

const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * s.length)))]; };
/** All ensemble members' values for one variable on day i. */
function members(daily, name, i) {
  return Object.keys(daily).filter(k => k === name || k.startsWith(name + '_member')).map(k => daily[k][i]).filter(v => v !== null && v !== undefined);
}
const dayName = ymd => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); };
const inWords = f => f >= 0.9 ? 'almost all' : f >= 0.75 ? '3 in 4' : f >= 0.6 ? '6 in 10' : f >= 0.5 ? 'half' : f >= 0.4 ? '4 in 10' : f >= 0.3 ? '3 in 10' : f >= 0.2 ? '1 in 5' : '1 in 10';

// What counts as worth a heads-up in Witney, and how many of the 51 runs must agree.
export const RULES = [
  { kind: 'severe-frost', icon: '🥶', label: 'Severe frost', test: d => d.minShare(-6), need: 0.5, why: d => `down to about ${Math.round(d.minMed)}°C` },
  { kind: 'hard-frost', icon: '❄️', label: 'Hard frost', test: d => d.minShare(-3), need: 0.6, why: d => `down to about ${Math.round(d.minMed)}°C` },
  { kind: 'snow', icon: '🌨️', label: 'Snow possible', test: d => d.share('snowfall_sum', v => v >= 1), need: 0.35, why: d => `${inWords(d.share('snowfall_sum', v => v >= 1))} forecasts show settling snow` },
  { kind: 'gales', icon: '💨', label: 'Gales', test: d => d.share('wind_gusts_10m_max', v => v >= 80), need: 0.5, why: d => `gusts around ${Math.round(d.med('wind_gusts_10m_max') * 0.621)} mph` },
  { kind: 'ice-day', icon: '🧊', label: 'Freezing all day', test: d => d.share('temperature_2m_max', v => v <= 0), need: 0.5, why: () => 'not getting above freezing' },
  { kind: 'frost', icon: '🌡️', label: 'Frosty night', quiet: true, test: d => d.minShare(0), need: 0.7, why: d => `around ${Math.round(d.minMed)}°C overnight` }
];

/** Heads-ups from the 15-day ensemble: [{ kind, icon, label, from, to, days, agree, text, notify }]. */
export function headsUp(ens, today) {
  const daily = ens && ens.daily; if (!daily || !daily.time) return [];
  const found = [];
  daily.time.forEach((day, i) => {
    if (day <= today) return; // from tomorrow
    const d = {
      share: (name, f) => { const v = members(daily, name, i); return v.length ? v.filter(f).length / v.length : 0; },
      med: name => median(members(daily, name, i)),
      minShare: t => { const v = members(daily, 'temperature_2m_min', i); return v.length ? v.filter(x => x <= t).length / v.length : 0; },
      get minMed() { return median(members(daily, 'temperature_2m_min', i)); }
    };
    for (const r of RULES) {
      const agree = r.test(d);
      if (agree >= r.need) { found.push({ kind: r.kind, icon: r.icon, label: r.label, quiet: !!r.quiet, day, agree, why: r.why(d), coldest: Math.round(pct(members(daily, 'temperature_2m_min', i), 0.1)) }); break; } // one per day, most serious first
    }
  });
  // Join runs of the same kind on following days into one item.
  const out = [];
  for (const f of found) {
    const last = out[out.length - 1];
    if (last && last.kind === f.kind && daysBetween(last.to, f.day) === 1) { last.to = f.day; last.days++; last.agree = Math.min(last.agree, f.agree); last.coldest = Math.min(last.coldest, f.coldest); }
    else out.push({ kind: f.kind, icon: f.icon, label: f.label, quiet: f.quiet, from: f.day, to: f.day, days: 1, agree: f.agree, why: f.why, coldest: f.coldest });
  }
  return out.map(x => ({ ...x, when: x.days === 1 ? dayName(x.from) : `${dayName(x.from)} to ${dayName(x.to)}`, sure: inWords(x.agree), ahead: daysBetween(today, x.from) }));
}
export function daysBetween(a, b) { const t = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); return Math.round((t(b) - t(a)) / 86400000); }

/** Weeks 3 to 6 from the seasonal ensemble: a trend, not a forecast. */
export function trend(seas, today) {
  const daily = seas && seas.daily; if (!daily || !daily.time) return [];
  const weeks = [];
  for (let start = 14; start + 7 <= daily.time.length; start += 7) {
    const idx = [...Array(7)].map((_, k) => start + k).filter(i => daily.time[i] > today);
    if (idx.length < 7) continue;
    const mins = idx.flatMap(i => members(daily, 'temperature_2m_min', i)), maxs = idx.flatMap(i => members(daily, 'temperature_2m_max', i));
    if (!mins.length) continue;
    const frost = mins.filter(v => v <= 0).length / mins.length, hard = mins.filter(v => v <= -5).length / mins.length;
    const text = frost >= 0.45 ? 'Frosty nights likely' : frost >= 0.25 ? 'Some frosty nights' : frost >= 0.1 ? 'A frost or two possible' : 'Mostly frost-free';
    weeks.push({ from: daily.time[idx[0]], to: daily.time[idx[6]], week: dayName(daily.time[idx[0]]), text, frost: Math.round(frost * 100), hard: Math.round(hard * 100),
      nights: Math.round(median(mins)), days: Math.round(median(maxs)), coldest: Math.round(pct(mins, 0.05)) });
    if (weeks.length === 4) break;
  }
  return weeks;
}

/** The Met Office warnings RSS feed: [{ id, title, link, text, level, type, pubDate }]. */
export function parseWarnings(xml) {
  const items = String(xml || '').match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  const tag = (s, t) => { const m = new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`).exec(s); return m ? decode(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '')).trim() : ''; };
  return items.map(it => {
    const title = tag(it, 'title'), link = tag(it, 'link'), text = tag(it, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const level = (/\b(red|amber|yellow)\b/i.exec(title) || [, 'yellow'])[1].toLowerCase();
    const type = (/warning of ([a-z, &]+?)(?: affecting|$)/i.exec(title) || [, ''])[1].toLowerCase();
    return { id: tag(it, 'guid') || link || title, title, link: /^https:\/\/(www\.|weather\.)?metoffice\.gov\.uk\//.test(link) ? link : 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings', text: text.slice(0, 400), level, type, pubDate: tag(it, 'pubDate') };
  }).filter(w => w.title);
}
function decode(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&'); }

/** Push text for a new warning, and for a heads-up worth telling everyone about. */
export function warningText(w) {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  return { title: `⚠️ ${cap(w.level)} weather warning: ${w.type || 'severe weather'}`.slice(0, 80), body: (w.text || w.title).slice(0, 160), tag: 'wx-warn:' + w.id.slice(-40), url: './#weather' };
}
export function headsUpText(h) {
  return { title: `${h.icon} Heads-up: ${h.label.toLowerCase()} ${h.days > 1 ? 'from ' : ''}${h.when.split(' to ')[0]}`, body: `${cap1(h.why)} in ${PLACE.name}. ${cap1(h.sure)} forecasts agree.`.slice(0, 160), tag: 'wx-ahead:' + h.kind + ':' + h.from, url: './#weather' };
}
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
/** Which heads-ups are firm enough to send to everyone: 2 to 10 days ahead, or a severe one up to 14. */
export const worthTelling = h => !h.quiet && (h.ahead >= 2 && h.ahead <= 10 && h.agree >= 0.6) || (h.ahead <= 14 && h.agree >= 0.6 && /severe|snow|gales|ice-day/.test(h.kind));
