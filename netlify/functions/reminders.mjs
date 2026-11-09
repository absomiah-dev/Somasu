// Somasu: sends event reminders. Netlify runs this every 5 minutes on the live
// site (scheduled functions don't run on test copies). It also keeps the free Supabase
// project awake, so no separate keep-alive job is needed.
process.env.TZ = 'Europe/London';
import { rest, sendToSubs, occurrences, addDays, ymd, binCollections, env, fmtTime, fmtDay } from '../lib/somasu.mjs';

const CATCH_UP = 30 * 60000; // a reminder up to 30 minutes late is still sent (a missed run, say)
const ALL_DAY_HOUR = 8;      // all-day events are reminded from 8am, not midnight

function label(mins) {
  if (mins === 0) return 'Starting now';
  if (mins < 60) return `In ${mins} minutes`;
  if (mins < 1440) return `In ${mins / 60} hour${mins === 60 ? '' : 's'}`;
  if (mins === 1440) return 'Tomorrow';
  if (mins === 10080) return 'In a week';
  return `In ${Math.round(mins / 1440)} days`;
}

export function dueReminders(events, now) {
  const due = [];
  for (const ev of events) {
    const mins = ev.remind_minutes;
    if (mins == null || mins < 0) continue;
    const start = new Date(ev.start_at), end = new Date(ev.end_at);
    const o = { start, end, repeat: ev.repeat, until: ev.repeat_until ? addDays(new Date(ev.repeat_until + 'T00:00:00'), 1) : null, exdates: new Set(ev.skip_dates || []) };
    const shift = mins * 60000 - (ev.all_day ? ALL_DAY_HOUR * 3600000 : 0); // reminder time = start - shift
    const from = new Date(+now - CATCH_UP + shift), to = new Date(+now + shift + 1);
    for (const oc of occurrences(o, new Date(+from - (end - start)), to)) {
      const fireAt = +oc.start - shift;
      if (fireAt > +now - CATCH_UP && fireAt <= +now) due.push({ ev, start: oc.start, mins });
    }
  }
  return due;
}

export function reminderText(ev, start, mins) {
  const where = ev.location ? ` · ${String(ev.location).slice(0, 60)}` : '';
  const when = ev.all_day ? (mins >= 1440 ? fmtDay(start) + ', all day' : 'Today, all day') : (mins >= 1440 ? `${fmtDay(start)} at ${fmtTime(start)}` : fmtTime(start));
  return { title: `⏰ ${String(ev.title).slice(0, 80)}`, body: `${ev.all_day && mins === 0 ? 'Today' : label(mins)} · ${when}${where}`, tag: 'remind:' + ev.id, url: './#calendar/' + start.toISOString().slice(0, 10) };
}

/* Bin day (26 R10): at 7pm UK the evening before a collection, tell everyone with Bin day
   notifications on which bin goes out. The rule is the family setting "bins" (app_settings). */
export const BIN_HOUR = 19;
export function binDue(cfg, now) {
  if (!cfg || cfg.remind === false) return null;
  const at = new Date(now); at.setHours(BIN_HOUR, 0, 0, 0);
  if (now < at || now - at >= CATCH_UP) return null;
  const tmrw = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1);
  return binCollections(cfg, tmrw, addDays(tmrw, 1))[0] || null;
}
export function binText(cfg, b) {
  return { title: `🗑️ ${String(b.type.name).slice(0, 40)} tomorrow`, body: [b.type.what, cfg.out, b.moved ? 'Moved from the usual day' : ''].filter(Boolean).join(' · ').slice(0, 160) || 'Bin day tomorrow', tag: 'bins:' + ymd(b.date), url: './#calendar/' + ymd(b.date) };
}
async function binReminder(now) {
  if (now.getHours() !== BIN_HOUR) return 0;
  const rows = await rest('app_settings?select=value&key=eq.bins').catch(() => []);
  let cfg = null; try { cfg = rows && rows[0] && rows[0].value ? JSON.parse(rows[0].value) : null; } catch (e) { cfg = null; }
  const b = binDue(cfg, now); if (!b) return 0;
  // Claim tomorrow's reminder first (a second row in app_settings), so it is only ever sent once.
  const day = ymd(b.date);
  let claimed = await rest('app_settings?key=eq.bins_reminded&value=neq.' + day, { method: 'PATCH', prefer: 'return=representation', body: { value: day, updated_at: new Date().toISOString() } });
  if (!claimed || !claimed.length) claimed = await rest('app_settings', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=representation', body: { key: 'bins_reminded', value: day } });
  if (!claimed || !claimed.length) return 0;
  const subs = (await rest('push_subscriptions?select=id,member_id,endpoint,p256dh,auth,prefs')).filter(s => (s.prefs || {}).bins !== false);
  return (await sendToSubs(subs, binText(cfg, b))).sent;
}

export default async () => {
  if (!env('SUPABASE_SECRET_KEY')) return new Response('Not set up', { status: 503 });
  const now = new Date();
  const events = await rest('events?select=id,title,all_day,start_at,end_at,who,location,repeat,repeat_until,skip_dates,remind_minutes&remind_minutes=not.is.null');
  const due = dueReminders(events, now);
  let sent = 0;
  if (due.length && env('VAPID_PRIVATE_KEY')) {
    const subs = (await rest('push_subscriptions?select=id,member_id,endpoint,p256dh,auth,prefs')).filter(s => (s.prefs || {}).reminders !== false);
    for (const d of due) {
      // Claim this reminder first, so two overlapping runs can never send it twice.
      const claimed = await rest('reminders_sent', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=representation', body: { event_id: d.ev.id, occurs_at: d.start.toISOString() } });
      if (!claimed || !claimed.length) continue;
      const who = d.ev.who || [];
      const to = who.length ? subs.filter(s => who.includes(s.member_id)) : subs;
      sent += (await sendToSubs(to, reminderText(d.ev, d.start, d.mins))).sent;
    }
  }
  if (env('VAPID_PRIVATE_KEY')) sent += await binReminder(now).catch(e => { console.error('bin reminder failed', e); return 0; });
  if (now.getMinutes() < 5 && now.getHours() === 3) await rest('reminders_sent?sent_at=lt.' + new Date(+now - 30 * 86400000).toISOString(), { method: 'DELETE' }).catch(() => {});
  console.log(`reminders: ${events.length} with reminders, ${due.length} due, ${sent} sent`);
  return new Response('ok');
};

export const config = { schedule: '*/5 * * * *' };
