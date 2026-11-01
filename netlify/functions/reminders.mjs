// Somasu: sends event reminders. Netlify runs this every 5 minutes on the live
// site (scheduled functions don't run on test copies). It also keeps the free Supabase
// project awake, so no separate keep-alive job is needed.
process.env.TZ = 'Europe/London';
import { rest, sendToSubs, occurrences, addDays, env, fmtTime, fmtDay } from '../lib/somasu.mjs';

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
  if (now.getMinutes() < 5 && now.getHours() === 3) await rest('reminders_sent?sent_at=lt.' + new Date(+now - 30 * 86400000).toISOString(), { method: 'DELETE' }).catch(() => {});
  console.log(`reminders: ${events.length} with reminders, ${due.length} due, ${sent} sent`);
  return new Response('ok');
};

export const config = { schedule: '*/5 * * * *' };
