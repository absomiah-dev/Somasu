/* Somasu · the Somiah family planner
   Shared shopping and to-do lists, family calendar (with linked Google / Outlook /
   Apple calendars) and booking of shared family things.
   Plain JavaScript, no build step. Data lives in Supabase (family mode) or in this
   browser (try-out mode). */
(function () {
'use strict';

/* ---- Version and release notes ----
   Rule (same as St Kenelm's and Vitro Expenses): two-digit year + release. Test builds
   before go-live are R0.x; go-live is R1; every deploy after that adds one.
   On every new build: change APP_RELEASE and APP_UPDATED, the <meta name="app-version">
   tag in index.html and the CACHE name in sw.js, and add the release at the top of RELEASES.
   Plain English, one short sentence per item, what people will notice. */
const APP_YEAR = '26', APP_RELEASE = 'R10', APP_UPDATED = '9 Nov 2026';
const VERSION = APP_YEAR + ' ' + APP_RELEASE;
const VERSION_DATE = APP_UPDATED;
const PRE_RELEASE = /^R0\./.test(APP_RELEASE);
const RELEASES = [
  { v: '26 R10', date: '9 Nov 2026',
    everyone: ['At a glance on Home: bin day, what’s on today, the shopping list and whether the car (or whatever you share) is free, in four small tiles. Tap one to open it.', 'Bin day: Somasu shows which bin goes out on Home and in the calendar, and can remind you at 7pm the evening before. Turn the reminder on or off under Family › Notifications.'],
    admin: ['Set up bin day under Family › Bin day: copy one collection date and the bins from the council’s calendar, plus any bank holiday changes. Somasu works out every week from that.'] },
  { v: '26 R9', date: '8 Nov 2026',
    everyone: ['Scan a barcode to add something to a shopping list: tap the scan button next to the add box and point your camera at the barcode. Somasu fills in the name, size and aisle for you.', 'Compare prices: open any shopping item, or a scanned product, and tap Compare prices to see what the supermarkets charge on Trolley.co.uk.', 'More colours to choose from: 19 instead of 8, including brighter red, yellow, orange, pink and sky blue. Initials always stay easy to read.'],
    admin: ['Adding a family member now sets up their sign-in too, with a starting password you choose (or tap Make one for me). No more trips to Supabase.', 'Forgotten password? Tap the person, type a new starting password and save. Removing someone removes their sign-in as well.'] },
  { v: '26 R8', date: '7 Nov 2026',
    everyone: ['Every password box now has a Show button, so you can check what you’ve typed before you sign in or save a new password. Tap Hide to cover it again.', 'On a computer, Somasu now tells you when Caps Lock is on while you type a password.', 'A new how-to video in Help shows signing in and changing your password.'],
    admin: ['The admin guide explains how names now show in Supabase’s Users list, and how Show and the Caps Lock note help someone who can’t sign in.'] },
  { v: '26 R7', date: '5 Nov 2026',
    everyone: ['New Report a problem link at the bottom of Home and Family, and in Help. It opens an email to the family admin with the page, version and device filled in.', 'Behind-the-scenes update to keep Somasu fast and secure.'],
    admin: ['Problem reports go to SomiahDev@proton.me. Admins can change the address under Family › Problem reports (needs database script v5, run once).'] },
  { v: '26 R6', date: '5 Nov 2026',
    everyone: ['Notifications fixed: they were being held up by a setting on the server.', 'Send me a test now tells you whether it reached your device, and what to do if it didn’t.'],
    admin: ['If notifications can’t be sent, the app now shows the reason (for example a wrong server key) instead of an error number.'] },
  { v: '26 R5', date: '5 Nov 2026',
    everyone: ['Somasu has a fresh new look: soft moringa green with butter, blush and periwinkle touches, and a new app icon.', 'The user guide and how-to videos now show the new look, and the guide explains how shared calendar events show once.', 'Installed Somasu on your phone? The new icon can take a few days to appear. To see it now, remove Somasu from your Home Screen and add it again.'],
    admin: ['The admin guide shows the new look too.'] },
  { v: '26 R4', date: '5 Nov 2026',
    everyone: ['An event that’s in more than one person’s linked calendar now shows once, with the faces of everyone it belongs to.', 'Tap it to see which calendars it’s in.'],
    admin: [] },
  { v: '26 R3', date: '2 Nov 2026',
    everyone: ['There’s now a Sign out button at the top of every page, so you can sign out in one tap (it checks with you first).'],
    admin: [] },
  { v: '26 R2', date: '1 Nov 2026',
    everyone: [
      'Linking calendars is much quicker: pick Google, Outlook, Apple or school, follow the steps, paste, done. Somasu checks the link and names it for you.',
      'School and club calendars now work without any admin set-up.',
      'Five short how-to videos in Help, with a Watch how link for the page you’re on.',
      'The Help button now says Help, and the version and What’s new are at the bottom of Home.',
      'The tab bar and + button now sit above the Netlify badge, so nothing is covered.'
    ],
    admin: ['The calendar fetcher now accepts any public https calendar for signed-in family members (private-network addresses still refused), so EXTRA_ICS_HOSTS is no longer needed.'] },
  { v: '26 R1', date: '1 Nov 2026',
    everyone: [
      'Somasu is live for the Somiah family: shared lists, the family calendar, bookings and notifications.',
      'Sign in with your email and password; install it on your phone from the Family page.',
      'Turn on notifications under Family to hear about list additions, events for you, bookings and reminders.'
    ],
    admin: ['Gold release on the dedicated SomiahDev Netlify and Supabase accounts, with the code on absomiah-dev/somasu.'] },
  { v: '26 R0.4', date: '1 Nov 2026',
    everyone: ['Sign in with your email and a password. Forgotten it? Use the link on the sign-in page to set a new one.', 'Change your password any time under Family.'],
    admin: ['Supabase’s free plan no longer lets new projects change their emails, so sign-in codes were replaced with passwords. No extra email service needed.'] },
  { v: '26 R0.3', date: '1 Nov 2026',
    everyone: ['New name: Somasu, a blend of Somiah and Abusua (Twi for family).'],
    admin: ['Guides updated for the new name.'] },
  { v: '26 R0.2', date: '1 Nov 2026',
    everyone: [
      'Notifications: hear when someone adds to a list, books something, or adds or changes an event that involves you.',
      'Reminders: choose when to be reminded as you add an event.',
      'New ? Help button with the user guide, and this What’s new panel from the version line.'
    ],
    admin: [
      'Admin guide: setting up, family members, notifications, releases and troubleshooting.',
      'Database script v2 adds notification devices and reminders.'
    ] },
  { v: '26 R0.1', date: '1 Nov 2026',
    everyone: [
      'Shared lists: shopping sorted by aisle, to-do lists and “add again” suggestions.',
      'Family calendar with a colour per person, repeating events and linked Google, Outlook and Apple calendars.',
      'Book the car, a room or anything else the family shares, with no double bookings.',
      'Install it on iPhone, Android, Windows, Mac or Linux.'
    ],
    admin: ['Family members with admin rights, and database rules that only let the family in.'] }
];
/* Guide PDFs opened by the ? Help button. If a guide is edited and its pages move,
   update the page numbers here. */
const GUIDES = {
  user: { file: 'guides/Somasu-User-Guide.pdf', title: 'User guide', contents: [{"t": "Welcome to Somasu", "p": 3}, {"t": "Getting started", "p": 4}, {"t": "Home", "p": 5, "topic": "home"}, {"t": "Lists", "p": 8, "topic": "lists"}, {"t": "Calendar", "p": 11, "topic": "calendar"}, {"t": "Bookings", "p": 13, "topic": "bookings"}, {"t": "Notifications", "p": 14}, {"t": "Family and settings", "p": 16, "topic": "family"}, {"t": "Questions and fixes", "p": 20}] },
  admin: { file: 'guides/Somasu-Admin-Guide.pdf', title: 'Admin guide', contents: [{"t": "What admins do", "p": 3}, {"t": "How Somasu is put together", "p": 3}, {"t": "Setting up Somasu", "p": 5}, {"t": "Family members", "p": 7}, {"t": "Bookings, calendars and bin day", "p": 8}, {"t": "Notifications behind the scenes", "p": 9}, {"t": "Releasing a new version", "p": 11}, {"t": "Backups and data", "p": 11}, {"t": "Troubleshooting", "p": 12}, {"t": "Checklist", "p": 12}] }
};
/* Short silent how-to videos (public/guides/videos). Re-record with 07_Videos when screens change. */
const VIDEOS = [
  { id: 'lists', file: 'guides/videos/somasu-01-lists.mp4', title: 'Add to the shopping list and tick things off', topic: 'lists' },
  { id: 'event', file: 'guides/videos/somasu-02-calendar-event.mp4', title: 'Add an event with a reminder', topic: 'calendar' },
  { id: 'booking', file: 'guides/videos/somasu-03-booking.mp4', title: 'Book the car (and what a clash looks like)', topic: 'bookings' },
  { id: 'notify', file: 'guides/videos/somasu-04-notifications.mp4', title: 'Turn on notifications', topic: 'family' },
  { id: 'linkcal', file: 'guides/videos/somasu-05-link-calendar.mp4', title: 'Link a Google, Outlook or school calendar', topic: 'family' },
  { id: 'passwords', file: 'guides/videos/somasu-06-passwords.mp4', title: 'Sign in, and check your password with Show', topic: 'family' },
  { id: 'scan', file: 'guides/videos/somasu-07-scan.mp4', title: 'Scan a barcode to add it to the shopping list', topic: 'lists' }
];
const CFG = window.SOMASU_CONFIG || {};
const FAMILY_MODE = !!(CFG.supabaseUrl && CFG.supabaseKey);
const TABLES = ['members', 'lists', 'items', 'events', 'calendars', 'facilities', 'bookings'];
// Colours for people and bookable things (26 R9: 8 widened to 19, with brighter choices). Initials sit in
// white on the deeper colours and in dark ink on the bright ones (onColour), so every pairing passes the
// 4.5:1 contrast test. Colours saved before R9 that aren't listed stay available as "Current colour".
const COLOUR_NAMES = {
  '#3B6A50': 'Forest', '#5361C2': 'Indigo', '#A1554B': 'Terracotta', '#2F7F86': 'Teal', '#8A5A9E': 'Plum', '#24427A': 'Navy', '#7A4A2A': 'Chestnut', '#1D3328': 'Ink',
  '#DB2B24': 'Red', '#F5871F': 'Orange', '#F6C324': 'Yellow', '#8DC63F': 'Lime', '#22C1B0': 'Turquoise', '#42B0E8': 'Sky', '#F26AA6': 'Pink', '#B79CF2': 'Lilac',
  '#111111': 'Black', '#1D4ED8': 'Royal blue', '#C0168F': 'Magenta' };
const COLOURS = Object.keys(COLOUR_NAMES);
// White or dark-ink text, whichever reads better on a colour (WCAG contrast).
function onColour(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return '#fff';
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const n = parseInt(m[1], 16), L = 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
  return 1.05 / (L + 0.05) >= (L + 0.05) / (0.0298 + 0.05) ? '#fff' : '#1D3328';
}
const ICS_ENDPOINT = '/api/ics';

/* ------------------------------------------------------------------ helpers */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const at = (dateStr, timeStr) => { const d = parseYmd(dateStr); const [h, m] = (timeStr || '00:00').split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) => ymd(a) === ymd(b);
const fmtTime = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDayLong = d => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtDayShort = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const initials = n => (n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
function ago(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
  return fmtDayShort(new Date(iso));
}
function relDay(d) {
  const t = sod(new Date()), x = sod(d), diff = Math.round((x - t) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return fmtDayLong(d);
}
const store_get = (k, f) => { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } };
const store_set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };

/* ------------------------------------------------------------------ icons */
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h.01M6 12h.01M6 18h.01M10 6h10M10 12h10M10 18h10"/><path d="M3 3h18v18H3z" stroke-opacity="0"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2.5 3h2.6l2.3 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 7H6"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4.5"/><path d="m11.5 11.5 8-8M16 7l3 3M14 9l2 2"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m6 9 6 6 6-6"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10.5 8v8M14 8v8M17 8v8"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
};

/* ------------------------------------------------------------------ shopping categories */
// Checked in this order, so "toilet roll" lands in Household before "oil" can match Cupboard.
const CATS = [
  ['Frozen', ['frozen', 'ice cream', 'fish finger', 'oven chips', 'peas', 'pizza', 'ice lolly']],
  ['Household', ['toilet', 'kitchen roll', 'bin bag', 'washing', 'detergent', 'soap', 'bleach', 'sponge', 'foil', 'cling', 'dishwasher', 'fabric', 'cleaner', 'battery', 'batteries', 'bulb', 'tissue', 'laundry']],
  ['Personal care', ['shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'lotion', 'razor', 'plaster', 'paracetamol', 'nappies', 'wipes', 'sanitary', 'shea', 'shower gel', 'cotton', 'sun cream']],
  ['Meat & fish', ['chicken', 'beef', 'lamb', 'pork', 'mince', 'sausage', 'bacon', 'ham', 'turkey', 'fish', 'salmon', 'tuna', 'cod', 'prawn', 'mackerel', 'tilapia', 'goat', 'steak', 'meat', 'wings', 'drumstick']],
  ['Fruit & veg', ['apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'berr', 'pear', 'plum', 'mango', 'pineapple', 'melon', 'avocado', 'tomato', 'potato', 'onion', 'garlic', 'ginger', 'carrot', 'pepper', 'lettuce', 'salad', 'spinach', 'cabbage', 'broccoli', 'cucumber', 'mushroom', 'plantain', 'yam', 'cassava', 'okra', 'kontomire', 'herb', 'coriander', 'parsley', 'chilli', 'sweetcorn', 'courgette', 'aubergine', 'kale', 'leek', 'celery', 'fruit', 'veg']],
  ['Dairy & eggs', ['milk', 'cheese', 'butter', 'yog', 'cream', 'egg', 'margarine', 'custard']],
  ['Bakery', ['bread', 'roll', 'bagel', 'croissant', 'wrap', 'pitta', 'muffin', 'cake', 'bun', 'naan', 'tortilla', 'crumpet']],
  ['Drinks', ['juice', 'water', 'squash', 'cola', 'lemonade', 'wine', 'beer', 'drink', 'malt', 'milo']],
  ['Cupboard', ['rice', 'pasta', 'flour', 'sugar', 'salt', 'oil', 'tin', 'beans', 'puree', 'stock', 'cereal', 'oats', 'porridge', 'tea', 'coffee', 'jam', 'honey', 'sauce', 'ketchup', 'mayo', 'spice', 'noodle', 'lentil', 'gari', 'biscuit', 'crisps', 'nuts', 'gravy', 'vinegar', 'peanut', 'spaghetti', 'semolina', 'stock cube', 'maggi']]
];
const CAT_ORDER = [...CATS.map(c => c[0]), 'Other'];
const CAT_EXACT = [['peanut butter', 'Cupboard'], ['coconut milk', 'Cupboard'], ['butternut', 'Fruit & veg'], ['sweet potato', 'Fruit & veg'], ['egg noodle', 'Cupboard'], ['fish sauce', 'Cupboard'], ['bread flour', 'Cupboard']];
function guessCat(text) {
  const t = ' ' + text.toLowerCase() + ' ';
  for (const [w, c] of CAT_EXACT) if (t.includes(w)) return c;
  for (const [name, words] of CATS) if (words.some(w => t.includes(w))) return name;
  return 'Other';
}

/* ------------------------------------------------------------------ data stores */
// Both stores have the same shape: all(table), insert(table,row), update(table,id,patch),
// remove(table,id), onChange(cb). The app never needs to know which one it's talking to.
function sampleData() {
  const me = uid(), am = uid(), shop = uid(), todo = uid(), car = uid();
  const now = new Date(), today = ymd(now);
  const iso = (dayOffset, t) => at(ymd(addDays(now, dayOffset)), t).toISOString();
  const nextThu = addDays(now, (4 - now.getDay() + 7) % 7);
  const it = (list, text, by, mins) => ({ id: uid(), list_id: list, text, category: guessCat(text), note: '', done: false, cleared: false, added_by: by, created_at: new Date(Date.now() - mins * 60000).toISOString() });
  return {
    members: [
      { id: me, name: 'Andy', email: 'andy@example.com', colour: '#3B6A50', is_admin: true },
      { id: am, name: 'Ammita', email: 'ammita@example.com', colour: '#5361C2', is_admin: false }
    ],
    lists: [
      { id: shop, name: 'Weekly shop', kind: 'shopping', sort: 1 },
      { id: todo, name: 'To do', kind: 'todo', sort: 2 }
    ],
    items: [
      it(shop, 'Milk (2 pints)', me, 30), it(shop, 'Plantain', am, 95), it(shop, 'Bread', am, 200), it(shop, 'Basmati rice', me, 600),
      it(shop, 'Toilet roll', am, 900), it(shop, 'Chicken thighs', me, 1300), it(shop, 'Apples', am, 2000),
      it(todo, 'Book the car in for a service', me, 3000), it(todo, 'Renew home insurance', am, 5000)
    ],
    events: [
      { id: uid(), title: 'Family dinner', all_day: false, start_at: iso(0, '18:30'), end_at: iso(0, '20:00'), who: [], location: 'Home', notes: '', repeat: 'none', repeat_until: null, created_by: me },
      { id: uid(), title: 'Swimming', all_day: false, start_at: iso(2, '17:00'), end_at: iso(2, '18:00'), who: [am], location: 'Windrush Leisure Centre', notes: '', repeat: 'weekly', repeat_until: null, remind_minutes: 30, created_by: am },
      { id: uid(), title: 'Client call', all_day: false, start_at: iso(1, '10:00'), end_at: iso(1, '11:00'), who: [me], location: '', notes: '', repeat: 'none', repeat_until: null, created_by: me }
    ],
    calendars: [],
    facilities: [{ id: car, name: 'Family car', note: 'Keys on the hook by the door', colour: '#3B6A50' }],
    bookings: [{ id: uid(), facility_id: car, member_id: am, start_at: iso(1, '09:00'), end_at: iso(1, '13:00'), note: 'Big shop and drop-off', created_by: am }],
    _today: today
  };
}

function LocalStore() {
  const KEY = 'somasu-local-v1';
  let db = store_get(KEY, null);
  if (!db) { db = sampleData(); store_set(KEY, db); }
  const subs = [];
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('somasu') : null;
  const save = t => { store_set(KEY, db); bc && bc.postMessage(t); setTimeout(() => subs.forEach(cb => cb(t)), 0); }; // this tab and any other open tabs
  const reload = t => { db = store_get(KEY, db); subs.forEach(cb => cb(t)); };
  bc && (bc.onmessage = e => reload(e.data));
  return {
    mode: 'local',
    async all(t) { return JSON.parse(JSON.stringify(db[t] || [])); },
    async insert(t, row) { const r = Object.assign({ id: uid(), created_at: new Date().toISOString() }, row); (db[t] = db[t] || []).push(r); save(t); return r; },
    async update(t, id, patch) { const r = (db[t] || []).find(x => x.id === id); if (r) Object.assign(r, patch); save(t); return r; },
    async remove(t, id) {
      db[t] = (db[t] || []).filter(x => x.id !== id);
      if (t === 'lists') db.items = db.items.filter(x => x.list_id !== id);
      if (t === 'facilities') db.bookings = db.bookings.filter(x => x.facility_id !== id);
      save(t);
    },
    onChange(cb) { subs.push(cb); },
    reset(sample) { db = sample ? sampleData() : { members: db.members, lists: db.lists.map(l => l), items: [], events: [], calendars: [], facilities: [], bookings: [] }; save('*'); }
  };
}

function SupaStore(client) {
  const subs = [];
  const chk = ({ data, error }) => { if (error) throw error; return data; };
  client.channel('somasu-all')
    .on('postgres_changes', { event: '*', schema: 'public' }, p => subs.forEach(cb => cb(p.table)))
    .subscribe();
  return {
    mode: 'family',
    async all(t) { return chk(await client.from(t).select('*').limit(5000)); },
    async insert(t, row) { return chk(await client.from(t).insert(row).select().single()); },
    async update(t, id, patch) { return chk(await client.from(t).update(patch).eq('id', id).select().single()); },
    async remove(t, id) { chk(await client.from(t).delete().eq('id', id)); },
    onChange(cb) { subs.push(cb); }
  };
}

/* ------------------------------------------------------------------ state */
const S = {
  tab: store_get('somasu-tab', 'home'),
  members: [], lists: [], items: [], events: [], calendars: [], facilities: [], bookings: [],
  me: null, user: null, external: {}, extStatus: {}, settings: {},
  listId: store_get('somasu-list', null), showDone: false,
  calMonth: sod(new Date()), calDay: sod(new Date()), calView: store_get('somasu-calview', 'month'),
  hidden: new Set(store_get('somasu-hidden', [])),
  facilityId: null, bookDay: sod(new Date())
};
let store = null, client = null;

const memberById = id => S.members.find(m => m.id === id);
const mName = id => (memberById(id) || {}).name || 'Someone';
const mColour = id => (memberById(id) || {}).colour || '#5E6B64';
const avatar = (id, cls = '') => { const m = memberById(id); return m ? `<span class="av ${cls}" style="background:${esc(m.colour)};color:${onColour(m.colour)}" title="${esc(m.name)}">${esc(initials(m.name))}</span>` : ''; };
const isAdmin = () => !FAMILY_MODE || (S.me && S.me.is_admin);

async function loadAll(tables = TABLES) {
  const res = await Promise.all(tables.map(t => store.all(t)));
  tables.forEach((t, i) => { S[t] = res[i] || []; });
  S.lists.sort((a, b) => (a.sort || 0) - (b.sort || 0) || String(a.name).localeCompare(b.name));
  S.members.sort((a, b) => String(a.name).localeCompare(b.name));
  if (FAMILY_MODE) {
    const email = (S.user && S.user.email || '').toLowerCase();
    S.me = S.members.find(m => (m.email || '').toLowerCase() === email) || null;
  } else {
    const pick = store_get('somasu-me', null);
    S.me = S.members.find(m => m.id === pick) || S.members.find(m => m.is_admin) || S.members[0] || null;
  }
  if (tables === TABLES) await loadSettings();
}
/* Family settings (database script v5: app_settings). If the table isn't there yet, Somasu
   carries on with the built-in defaults. */
async function loadSettings() {
  try {
    if (FAMILY_MODE) {
      const { data, error } = await client.from('app_settings').select('key,value');
      if (error) throw error;
      S.settings = Object.fromEntries((data || []).map(r => [r.key, r.value]));
    } else {
      S.settings = store_get('somasu-settings', {});
      // Try-out mode: a sample bin rule (green one week, grey the next) so the bin features show.
      if (!('bins' in S.settings)) { const t = sod(new Date()), thu = addDays(t, (4 - t.getDay() + 7) % 7); S.settings.bins = JSON.stringify(Object.assign({}, BIN_SAMPLE, { anchor: ymd(thu) })); }
    }
  } catch (e) { console.warn('Family settings not loaded, using defaults:', e.message || e); S.settings = {}; }
}

/* ------------------------------------------------------------------ toast / modal */
let toastT;
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
}
function fail(e) { console.error(e); toast(navigator.onLine ? ('Couldn’t save: ' + (e.message || e)) : 'You’re offline. Try again when you’re connected.'); }

function modal(title, body, onMount) {
  closeModal();
  const s = document.createElement('div'); s.className = 'scrim'; s.id = 'scrim';
  s.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab"></div><h2>${esc(title)}<button class="icon-btn x" data-act="close" aria-label="Close">${I.x}</button></h2>${body}</div>`;
  s.addEventListener('mousedown', e => { if (e.target === s) closeModal(); });
  document.body.appendChild(s);
  const first = s.querySelector('input[type=text],input[type=email],input[type=url]');
  if (first && window.matchMedia('(min-width:700px)').matches) setTimeout(() => first.focus(), 50);
  onMount && onMount(s);
  return s;
}
function closeModal() { scanStop(); const s = $('#scrim'); s && s.remove(); }
function confirmBox(title, text, okLabel, onOk) {
  modal(title, `<p>${esc(text)}</p><div class="actions"><button class="btn ghost grow" data-act="close">Cancel</button><button class="btn danger grow" id="okb">${esc(okLabel)}</button></div>`,
    s => { s.querySelector('#okb').onclick = async () => { closeModal(); try { await onOk(); } catch (e) { fail(e); } }; });
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ------------------------------------------------------------------ recurrence */
const PERIOD = { daily: 1, weekly: 7, fortnightly: 14 };
function nthWeekday(y, m, nth, wd) { // nth: 1..5 or -1 (last)
  if (nth > 0) { const d = new Date(y, m, 1); const off = (wd - d.getDay() + 7) % 7; d.setDate(1 + off + (nth - 1) * 7); return d.getMonth() === m ? d : null; }
  const d = new Date(y, m + 1, 0); d.setDate(d.getDate() - ((d.getDay() - wd + 7) % 7)); return d;
}
// o: {start:Date, end:Date, repeat, interval, until:Date|null, count, exdates:Set<ymd>, nth, wd}
function occurrences(o, from, to) {
  const out = [], dur = o.end - o.start;
  if (!o.repeat || o.repeat === 'none') { if (o.end > from && o.start < to) out.push({ start: o.start, end: o.end }); return out; }
  const iv = o.interval || 1;
  let i = 0;
  if (PERIOD[o.repeat]) {
    const pd = PERIOD[o.repeat] * iv * 86400000;
    i = Math.max(0, Math.floor((from - o.start - dur) / pd) - 1);
  }
  for (let guard = 0; guard < 1500; guard++, i++) {
    if (o.count && i >= o.count) break;
    let s;
    if (PERIOD[o.repeat]) s = addDays(o.start, i * PERIOD[o.repeat] * iv);
    else if (o.repeat === 'monthly' && o.nth) {
      const base = new Date(o.start.getFullYear(), o.start.getMonth() + i * iv, 1);
      s = nthWeekday(base.getFullYear(), base.getMonth(), o.nth, o.wd);
      if (!s) continue;
      s.setHours(o.start.getHours(), o.start.getMinutes(), 0, 0);
    } else if (o.repeat === 'monthly') {
      s = new Date(o.start); s.setDate(1); s.setMonth(s.getMonth() + i * iv);
      const dim = new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate();
      if (o.start.getDate() > dim) continue; // e.g. the 31st in a 30-day month
      s.setDate(o.start.getDate());
    } else if (o.repeat === 'yearly') { s = new Date(o.start); s.setFullYear(s.getFullYear() + i * iv); }
    else break;
    if (s >= to) break;
    if (o.until && s > o.until) break;
    const e = new Date(+s + dur);
    if (e > from && !(o.exdates && o.exdates.has(ymd(s)))) out.push({ start: s, end: e });
  }
  return out;
}

/* ------------------------------------------------------------------ iCal (linked calendars) */
function icsUnescape(v) { return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1'); }
function icsDate(v, p) {
  if (!v) return null;
  v = v.trim();
  if ((p && p.VALUE === 'DATE') || /^\d{8}$/.test(v)) return { d: new Date(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8)), allDay: true };
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const a = [+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)];
  // UTC times convert to local. Times with a TZID are read as local clock time, which is
  // right for a UK family whose calendars are all on UK time.
  return { d: m[7] ? new Date(Date.UTC(...a)) : new Date(...a), allDay: false };
}
function icsDuration(v) {
  const m = (v || '').match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  return ((+m[1] || 0) * 7 * 86400 + (+m[2] || 0) * 86400 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60 + (+m[5] || 0)) * 1000;
}
const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function parseICS(text) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const raw = []; let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = { EXDATE: [] }; continue; }
    if (line === 'END:VEVENT') { cur && raw.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':'); if (i < 0) continue;
    const [name, ...ps] = line.slice(0, i).split(';');
    const p = {}; ps.forEach(x => { const k = x.indexOf('='); if (k > 0) p[x.slice(0, k).toUpperCase()] = x.slice(k + 1); });
    const val = line.slice(i + 1), N = name.toUpperCase();
    if (N === 'EXDATE') val.split(',').forEach(x => { const d = icsDate(x, p); d && cur.EXDATE.push(ymd(d.d)); });
    else cur[N] = { val, p };
  }
  const out = [], moved = {};
  raw.forEach(r => { if (r['RECURRENCE-ID']) { const d = icsDate(r['RECURRENCE-ID'].val, r['RECURRENCE-ID'].p); if (d) (moved[r.UID && r.UID.val] = moved[r.UID && r.UID.val] || []).push(ymd(d.d)); } });
  for (const r of raw) {
    if (!r.DTSTART || (r.STATUS && r.STATUS.val === 'CANCELLED')) continue;
    const s = icsDate(r.DTSTART.val, r.DTSTART.p); if (!s) continue;
    let e = r.DTEND ? icsDate(r.DTEND.val, r.DTEND.p) : null;
    let end = e ? e.d : (r.DURATION ? new Date(+s.d + icsDuration(r.DURATION.val)) : (s.allDay ? addDays(s.d, 1) : new Date(+s.d + 3600000)));
    if (end <= s.d) end = s.allDay ? addDays(s.d, 1) : new Date(+s.d + 1800000);
    const base = {
      title: r.SUMMARY ? icsUnescape(r.SUMMARY.val) : '(No title)',
      location: r.LOCATION ? icsUnescape(r.LOCATION.val) : '',
      notes: r.DESCRIPTION ? icsUnescape(r.DESCRIPTION.val).slice(0, 600) : '',
      allDay: s.allDay, start: s.d, end, uid: r.UID ? r.UID.val : ''
    };
    const ex = new Set(r.EXDATE);
    if (!r['RECURRENCE-ID'] && r.UID && moved[r.UID.val]) moved[r.UID.val].forEach(x => ex.add(x));
    if (r.RRULE && !r['RECURRENCE-ID']) {
      const rr = {}; r.RRULE.val.split(';').forEach(x => { const [k, v] = x.split('='); rr[k] = v; });
      const freq = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' }[rr.FREQ];
      if (!freq) { out.push(base); continue; }
      const until = rr.UNTIL ? (icsDate(rr.UNTIL) || {}).d : null;
      const common = Object.assign({}, base, { repeat: freq, interval: +rr.INTERVAL || 1, until, count: +rr.COUNT || 0, exdates: ex });
      const days = rr.BYDAY ? rr.BYDAY.split(',') : [];
      if (freq === 'weekly' && days.length > 1) {
        // one series per weekday, each starting in the same week as the original
        days.forEach(dd => {
          const wd = WD[dd.slice(-2)]; if (wd == null) return;
          const shift = (wd - s.d.getDay() + 7) % 7;
          out.push(Object.assign({}, common, { start: addDays(s.d, shift), end: addDays(end, shift), count: common.count ? Math.ceil(common.count / days.length) : 0 }));
        });
      } else if (freq === 'monthly' && days.length === 1 && /^-?\d/.test(days[0])) {
        out.push(Object.assign({}, common, { nth: parseInt(days[0], 10), wd: WD[days[0].slice(-2)] }));
      } else out.push(common);
    } else out.push(base);
  }
  return out;
}
async function fetchICSText(rawUrl) {
  const headers = {};
  if (client) { const { data } = await client.auth.getSession(); if (data.session) headers.Authorization = 'Bearer ' + data.session.access_token; }
  const url = rawUrl.trim().replace(/^webcal:\/\//i, 'https://');
  const r = await fetch(ICS_ENDPOINT + '?url=' + encodeURIComponent(url), { headers });
  if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  const text = await r.text();
  if (!text.includes('BEGIN:VCALENDAR')) { const e = new Error('Not a calendar'); e.status = 422; throw e; }
  return text;
}
const icsCalName = text => { const m = /^X-WR-CALNAME:(.+)$/m.exec(text.replace(/\r?\n[ \t]/g, '')); return m ? icsUnescape(m[1].trim()).slice(0, 40) : ''; };
async function fetchCalendar(cal, force) {
  const cacheKey = 'somasu-ics-' + cal.id;
  const cached = store_get(cacheKey, null);
  if (cached && !force && Date.now() - cached.at < 15 * 60000) { S.external[cal.id] = parseICS(cached.text); S.extStatus[cal.id] = 'ok'; return; }
  try {
    const text = await fetchICSText(cal.url);
    store_set(cacheKey, { at: Date.now(), text });
    S.external[cal.id] = parseICS(text); S.extStatus[cal.id] = 'ok';
  } catch (e) {
    console.warn('Calendar', cal.name, e);
    if (cached) { S.external[cal.id] = parseICS(cached.text); S.extStatus[cal.id] = 'stale'; }
    else { S.external[cal.id] = []; S.extStatus[cal.id] = 'error'; }
  }
}
async function refreshCalendars(force) {
  await Promise.all(S.calendars.filter(c => c.visible !== false).map(c => fetchCalendar(c, force)));
  render();
}

/* All events (family + linked) between two dates, already expanded. */
function eventsBetween(from, to) {
  const out = [];
  for (const ev of S.events) {
    const who = ev.who || [];
    if (who.length && who.every(id => S.hidden.has('m:' + id))) continue;
    if (!who.length && S.hidden.has('m:everyone')) continue;
    const o = { start: new Date(ev.start_at), end: new Date(ev.end_at), repeat: ev.repeat, until: ev.repeat_until ? addDays(parseYmd(ev.repeat_until), 1) : null, exdates: new Set(ev.skip_dates || []) };
    occurrences(o, from, to).forEach(oc => out.push({ kind: 'family', ev, start: oc.start, end: oc.end, title: ev.title, allDay: ev.all_day, colour: who.length === 1 ? mColour(who[0]) : '#D9A441' }));
  }
  for (const cal of S.calendars) {
    if (cal.visible === false || S.hidden.has('c:' + cal.id)) continue;
    for (const x of (S.external[cal.id] || [])) occurrences(x, from, to).forEach(oc => out.push({ kind: 'linked', cal, x, start: oc.start, end: oc.end, title: x.title, allDay: x.allDay, colour: cal.colour || '#5361C2' }));
  }
  const merged = mergeDuplicates(out);
  if (!S.hidden.has('bins')) for (const x of binCollections(binsCfg(), from, to)) merged.push({ kind: 'bin', bin: x, start: x.date, end: addDays(x.date, 1), title: binTitle(x.type), allDay: true, colour: x.type.colour || '#5F6B66', cals: [] });
  return merged.sort((a, b) => (b.allDay - a.allDay) || (a.start - b.start));
}
/* The same event in several linked calendars (a shared invite, the school calendar linked by two
   people) shows once, with the faces of everyone whose calendar it's in. A match is the same event
   id (UID) at the same time, or the same title (ignoring capitals and spaces) with exactly the same
   start and end. A linked copy of a Somasu family event folds into the family event. Two family
   events are never merged, and near-matches ("Swim" and "Swimming lesson") stay separate. */
const normTitle = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
function mergeDuplicates(list) {
  const byKey = new Map(), byUid = new Map(), res = [];
  for (const e of list) {
    const key = normTitle(e.title) + '|' + (e.allDay ? 'a' : 't') + '|' + (+e.start) + '|' + (+e.end);
    const u = e.kind === 'linked' && e.x.uid ? e.x.uid + '|' + (+e.start) : '';
    const hit = e.kind === 'linked' ? (byKey.get(key) || (u && byUid.get(u))) : null;
    if (hit) {
      if (!hit.cals.includes(e.cal)) hit.cals.push(e.cal);
      if (hit.kind === 'linked' && new Set(calOwners(hit)).size > 1) hit.colour = '#D9A441';
      if (u && !byUid.has(u)) byUid.set(u, hit);
      continue;
    }
    e.cals = e.kind === 'linked' ? [e.cal] : [];
    res.push(e);
    if (!byKey.has(key)) byKey.set(key, e);
    if (u) byUid.set(u, e);
  }
  return res;
}
const calOwners = e => (e.cals || []).map(c => c.created_by).filter(id => memberById(id));
function avStack(ids) {
  const u = [...new Set(ids)].filter(id => memberById(id)); if (!u.length) return '';
  return `<span class="av-stack" title="${esc(u.map(mName).join(', '))}">${u.slice(0, 3).map(id => avatar(id)).join('')}${u.length > 3 ? `<span class="av more">+${u.length - 3}</span>` : ''}</span>`;
}
const calLabel = c => (memberById(c.created_by) ? mName(c.created_by) + ' · ' : '') + c.name;
function onDay(list, d) { const a = sod(d), b = addDays(a, 1); return list.filter(e => e.start < b && e.end > a); }

/* ------------------------------------------------------------------ bin collections (26 R10) */
// Bin day is stored as a rule, not a list of dates: the council collects on the same weekday,
// cycling through the bin types (green one week, grey the next), starting from one known
// collection (anchor). Bank holiday moves are listed as exceptions. The rule lives in the family
// settings (app_settings, key "bins", as JSON), so admins can change it in the app; Somasu never
// fetches the council website itself (it blocks automatic visitors). The update check reads the
// council's new calendar each March and emails Andy anything that needs changing.
const BIN_COLOURS = { '#2E8B57': 'Green', '#5F6B66': 'Grey', '#1F2A24': 'Black', '#2563EB': 'Blue', '#8B5A2B': 'Brown', '#7C3AED': 'Purple', '#DB2B24': 'Red' };
const BIN_SAMPLE = { anchor: '', types: [{ name: 'Green bin', what: 'Recycling, food waste, garden waste', colour: '#2E8B57' }, { name: 'Grey bin', what: 'Rubbish, food waste', colour: '#5F6B66' }], out: 'Out by 6am', moves: [], until: '', source: '', remind: true };
function binsCfg() {
  let c = (S.settings || {}).bins; if (!c) return null;
  try { c = typeof c === 'string' ? JSON.parse(c) : c; } catch (e) { return null; }
  if (!c || !/^\d{4}-\d{2}-\d{2}$/.test(c.anchor || '') || !Array.isArray(c.types) || !c.types.length) return null;
  return c;
}
/** Collections between two dates: [{ date, type, moved }], in date order. */
function binCollections(c, from, to) {
  if (!c) return [];
  const n = c.types.length, a = parseYmd(c.anchor), out = [];
  const moves = new Map((c.moves || []).filter(m => m && m.from).map(m => [m.from, m.to || '']));
  // Start a fortnight early so a collection moved forward into the range isn't missed.
  let k = Math.floor((sod(from) - a) / (7 * 86400000)) - 2;
  for (;; k++) {
    const d = addDays(a, k * 7); if (d > addDays(to, 14)) break;
    const type = c.types[((k % n) + n) % n], key = ymd(d);
    let date = d, moved = false;
    if (moves.has(key)) { const t = moves.get(key); if (!t) continue; date = parseYmd(t); moved = true; }
    if (date >= sod(from) && date < to) out.push({ date, type, moved });
  }
  return out.sort((x, y) => x.date - y.date);
}
/** The next collection still to come (today's counts until midday). */
function nextBin(c, now = new Date()) {
  const list = binCollections(c, sod(now), addDays(sod(now), 40));
  return list.find(x => !(sameDay(x.date, now) && now.getHours() >= 12)) || null;
}
const binTitle = t => t.name + (t.what ? ': ' + t.what.charAt(0).toLowerCase() + t.what.slice(1) : '');
function binSheet() {
  const c = binsCfg();
  if (!c) return modal('Bin day', `<p>Bin day isn’t set up yet.</p>${isAdmin() ? `<div class="actions"><button class="btn dark grow" data-act="edit-bins">Set up bin day</button></div>` : '<p class="small muted">Ask an admin to set it up under Family.</p>'}`);
  const list = binCollections(c, sod(new Date()), addDays(sod(new Date()), 56));
  modal('Bin day', `${list.map(x => `<div class="row"><span class="evbar" style="background:${esc(x.type.colour)}"></span><div class="main"><div class="t">${esc(x.type.name)}${x.moved ? ' <span class="small" style="color:var(--danger)">· moved</span>' : ''}</div><div class="m">${relDay(x.date)}${c.out ? ' · ' + esc(c.out) : ''}<br>${esc(x.type.what || '')}</div></div></div>`).join('')}
    ${c.until && parseYmd(c.until) < addDays(new Date(), 30) ? `<p class="small" style="color:var(--danger)">The council’s calendar runs to ${fmtDayShort(parseYmd(c.until))}. Check their new one for changed dates.</p>` : ''}
    <div class="actions">${c.source ? `<a class="btn ghost" href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">Council calendar</a>` : ''}${isAdmin() ? `<button class="btn ghost" data-act="edit-bins">Change</button>` : ''}<button class="btn dark grow" data-act="close">Done</button></div>`);
}
const dmy = s => { const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(String(s).trim()); if (!m) return null; const d = new Date(+m[3], m[2] - 1, +m[1]); return d.getMonth() === m[2] - 1 ? ymd(d) : null; };
const ymdToDmy = s => s ? s.split('-').reverse().join('-') : '';
function binsForm() {
  const c = binsCfg() || Object.assign({}, BIN_SAMPLE, { anchor: '' }), t = c.types.concat([{}, {}]).slice(0, 2);
  const colourSel = (name, cur) => `<select name="${name}">${Object.entries(BIN_COLOURS).map(([h, n]) => `<option value="${h}" ${h === cur ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  modal('Bin day', `<form data-form="bins" autocomplete="off">
    <p class="small muted" style="margin-top:0">Copy these from the council’s collection calendar. Somasu works out every week from them.</p>
    <div class="f"><label for="bA">One collection date, and which week’s bin it was</label><div class="row2"><input id="bA" type="date" name="anchor" required value="${esc(c.anchor)}"><select name="first"><option value="0">Week 1</option><option value="1">Week 2</option></select></div></div>
    <fieldset class="f"><legend>Week 1</legend><div class="row2"><input type="text" name="n0" maxlength="30" required value="${esc(t[0].name || '')}" placeholder="e.g. Green bin" aria-label="Week 1 bin">${colourSel('c0', t[0].colour || '#2E8B57')}</div><input type="text" name="w0" maxlength="80" value="${esc(t[0].what || '')}" placeholder="What goes out, e.g. Recycling, food waste" aria-label="Week 1: what goes out"></fieldset>
    <fieldset class="f"><legend>Week 2 <span class="muted" style="font-weight:500">(leave empty if it’s the same every week)</span></legend><div class="row2"><input type="text" name="n1" maxlength="30" value="${esc(t[1].name || '')}" placeholder="e.g. Grey bin" aria-label="Week 2 bin">${colourSel('c1', t[1].colour || '#5F6B66')}</div><input type="text" name="w1" maxlength="80" value="${esc(t[1].what || '')}" placeholder="What goes out, e.g. Rubbish, food waste" aria-label="Week 2: what goes out"></fieldset>
    <div class="f"><label for="bO">When to put it out</label><input type="text" id="bO" name="out" maxlength="40" value="${esc(c.out || '')}" placeholder="e.g. Out by 6am"></div>
    <div class="f"><label for="bM">Changed dates <span class="muted" style="font-weight:500">(bank holidays: one per line, “usual date &gt; new date”, or “&gt; none”)</span></label><textarea id="bM" name="moves" rows="3" placeholder="24-12-2026 > 27-12-2026">${esc((c.moves || []).map(m => ymdToDmy(m.from) + ' > ' + (m.to ? ymdToDmy(m.to) : 'none')).join('\n'))}</textarea></div>
    <div class="f"><label for="bU">Council calendar runs until <span class="muted" style="font-weight:500">(optional)</span></label><input id="bU" type="date" name="until" value="${esc(c.until || '')}"></div>
    <div class="f"><label for="bS">Link to the council’s calendar <span class="muted" style="font-weight:500">(optional)</span></label><input id="bS" type="url" name="source" value="${esc(c.source || '')}" placeholder="https://"></div>
    <label class="toggle"><input type="checkbox" name="remind" ${c.remind !== false ? 'checked' : ''}><span>Remind everyone the evening before<br><span class="small muted" style="font-weight:500">7pm, to phones with Bin day notifications on</span></span></label>
    <div class="actions">${binsCfg() ? `<button type="button" class="btn danger" data-act="clear-bins">Turn off</button>` : ''}<button type="button" class="btn ghost" data-act="close">Cancel</button><button type="submit" class="btn dark grow">Save</button></div></form>`);
}
async function saveSetting(key, value) {
  if (FAMILY_MODE) {
    const { error } = await client.from('app_settings').upsert({ key, value, updated_by: S.me && S.me.id, updated_at: new Date().toISOString() });
    if (error) throw new Error(/app_settings|relation|schema cache|does not exist/i.test(error.message) ? 'The family database needs a small update first: run database script v5 in Supabase (Admin guide).' : 'Couldn’t save: ' + error.message);
  } else store_set('somasu-settings', Object.assign({}, store_get('somasu-settings', {}), { [key]: value }));
  S.settings = Object.assign({}, S.settings, { [key]: value });
}

/* ------------------------------------------------------------------ rendering */
const TABS = [['home', 'Home', I.home], ['lists', 'Lists', I.cart], ['calendar', 'Calendar', I.cal], ['bookings', 'Bookings', I.key], ['more', 'Family', I.more]];
let renderQueued = false;
function render() { if (renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; draw(); }); }
function draw() {
  const app = $('#app');
  if (FAMILY_MODE && !S.user) return;
  const keepScroll = window.scrollY;
  const active = document.activeElement && document.activeElement.id;
  const view = { home: viewHome, lists: viewLists, calendar: viewCalendar, bookings: viewBookings, more: viewMore }[S.tab] || viewHome;
  const nav = TABS.map(([k, label, ic]) => `<button data-act="tab" data-tab="${k}" class="${S.tab === k ? 'on' : ''}" aria-label="${label}"><span class="ico">${ic}</span>${label}</button>`).join('');
  const side = TABS.map(([k, label, ic]) => `<button data-act="tab" data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${ic}${label}</button>`).join('');
  const fab = { lists: 'add-item-focus', calendar: 'new-event', bookings: 'new-booking', home: 'quick-add' }[S.tab];
  app.innerHTML = `
  <header class="top">
    <button class="brand" data-act="tab" data-tab="home" aria-label="Somasu home"><img src="icon-192.png" alt=""><span class="wm">Somasu<small>Somiah family planner</small></span></button>
    <span class="spacer"></span>
    ${FAMILY_MODE ? '' : '<span class="mode-pill" title="Data is kept on this device only">Try-out mode</span>'}
    <button class="help-btn" data-act="help" aria-label="Help and guides"><span class="q">?</span><span class="ht">Help</span></button>
    ${S.me ? `<button class="icon-btn" data-act="tab" data-tab="more" aria-label="Your settings">${avatar(S.me.id)}</button>` : ''}
    ${FAMILY_MODE && S.user ? `<button class="out-btn" data-act="sign-out-ask" aria-label="Sign out" title="Sign out">${I.out}<span class="ot">Sign out</span></button>` : ''}
  </header>
  <div class="layout">
    <nav class="side" aria-label="Main">${side}<div class="foot ver">${verHtml()}<br><a href="#" data-act="report">Report a problem</a></div></nav>
    <main id="main">${view()}</main>
  </div>
  ${fab ? `<button class="fab" data-act="${fab}" aria-label="Add">${I.plus}</button>` : ''}
  <nav class="nav" aria-label="Main">${nav}</nav>`;
  window.scrollTo(0, keepScroll);
  if (active) { const el = document.getElementById(active); el && el.focus(); }
}

/* ---------- Home ---------- */
function viewHome() {
  const now = new Date(), h = now.getHours();
  const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const all = eventsBetween(sod(now), addDays(sod(now), 8));
  const today = onDay(all, now).filter(e => e.allDay || e.end > now);
  const soon = all.filter(e => e.start >= addDays(sod(now), 1)).slice(0, 6);
  const shop = S.lists.map(l => ({ l, open: S.items.filter(i => i.list_id === l.id && !i.done && !i.cleared) }));
  const books = S.bookings.filter(b => new Date(b.end_at) > now && new Date(b.start_at) < addDays(sod(now), 2)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  return `
  ${!FAMILY_MODE ? `<div class="banner"><span>👋</span><span><b>Try-out mode.</b> This is sample data and it's saved on this device only. Once the family database is connected, everything here is shared and live.</span></div>` : ''}
  <div class="page-h"><h1>${hello}${S.me ? ', ' + esc(S.me.name) : ''}</h1><div class="sub">${fmtDayLong(now)}</div></div>
  ${glance(now, today, shop, books)}
  <div class="grid2">
    <section class="card"><h2><span class="dot" style="background:#D9A441"></span>Today<button class="more" data-act="tab" data-tab="calendar">Calendar</button></h2>
      ${today.length ? today.map(evRow).join('') : `<div class="empty"><b>Nothing else today</b>Enjoy the space.</div>`}
    </section>
    <section class="card"><h2><span class="dot" style="background:var(--green)"></span>Lists<button class="more" data-act="tab" data-tab="lists">Open lists</button></h2>
      ${shop.length ? shop.map(({ l, open }) => `
        <div class="row" data-act="open-list" data-id="${l.id}" style="cursor:pointer">
          <div class="main"><div class="t">${esc(l.name)}</div><div class="m">${open.length ? esc(open.slice(0, 4).map(i => i.text).join(', ')) + (open.length > 4 ? '…' : '') : 'All done'}</div></div>
          <span class="chip" style="min-height:30px;padding:4px 10px">${open.length}</span>
        </div>`).join('') : `<div class="empty">No lists yet.</div>`}
    </section>
    <section class="card"><h2><span class="dot" style="background:var(--indigo)"></span>Coming up</h2>
      ${soon.length ? soon.map(e => evRow(e, true)).join('') : `<div class="empty">Nothing in the next week.</div>`}
    </section>
    <section class="card"><h2><span class="dot" style="background:#A1554B"></span>Bookings<button class="more" data-act="tab" data-tab="bookings">Book</button></h2>
      ${books.length ? books.map(bookRow).join('') : `<div class="empty">Nothing booked today or tomorrow.</div>`}
    </section>
  </div>
  <p class="home-ver ver">${verHtml()}<br><a href="#" data-act="help">Help, guides and short videos</a> · <a href="#" data-act="report">Report a problem</a></p>`;
}
/* At a glance (26 R10): a row of small tiles at the top of Home with the things people check
   most: bin day, what's next today, the shopping list and whether the shared things are free.
   Each tile opens the full view. Tiles with nothing to show are left out. */
function glance(now, today, shop, books) {
  const tiles = [], c = binsCfg();
  if (c) {
    const b = nextBin(c, now);
    if (b) {
      const tmrw = sameDay(b.date, addDays(now, 1)), tday = sameDay(b.date, now);
      const hint = tday ? 'Today' + (c.out ? ' · ' + c.out : '') : tmrw ? (now.getHours() >= 16 ? 'Put it out tonight' : 'Tomorrow') : fmtDayShort(b.date);
      tiles.push(`<button class="tile${tday || tmrw ? ' hot' : ''}" data-act="bins"><span class="k">Bin day</span><span class="v"><i class="bindot" style="background:${esc(b.type.colour)}"></i>${esc(b.type.name)}</span><span class="h">${esc(hint)}${b.moved ? ' · moved' : ''}</span></button>`);
    }
  } else if (isAdmin()) tiles.push(`<button class="tile setup" data-act="edit-bins"><span class="k">Bin day</span><span class="v">Set it up</span><span class="h">Never miss the bins</span></button>`);
  const timed = today.filter(e => !e.allDay), cur = timed.find(e => e.start <= now && e.end > now), next = timed.find(e => e.start > now);
  tiles.push(`<button class="tile" data-act="tab" data-tab="calendar"><span class="k">Today</span><span class="v">${(k => k ? k + (k === 1 ? ' thing' : ' things') : 'Nothing')(today.filter(e => e.kind !== 'bin').length)} on</span><span class="h">${cur ? 'Now: ' + esc(cur.title) + ' till ' + fmtTime(cur.end) : next ? 'Next ' + fmtTime(next.start) + ' · ' + esc(next.title) : 'Nothing else today'}</span></button>`);
  const sh = shop.filter(x => x.l.kind === 'shopping'), n = sh.reduce((a, x) => a + x.open.length, 0);
  if (sh.length) tiles.push(`<button class="tile" data-act="open-list" data-id="${sh[0].l.id}"><span class="k">Shopping</span><span class="v">${n || 'All done'}${n ? ' to get' : ''}</span><span class="h">${n ? esc(sh.filter(x => x.open.length).map(x => x.l.name).join(', ')) : 'Nothing on the list'}</span></button>`);
  const f = S.facilities[0];
  if (f) {
    const cur = S.bookings.find(b => b.facility_id === f.id && new Date(b.start_at) <= now && new Date(b.end_at) > now);
    const nxt = S.bookings.filter(b => b.facility_id === f.id && new Date(b.start_at) > now).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0];
    tiles.push(`<button class="tile" data-act="tab" data-tab="bookings"><span class="k">${esc(f.name)}</span><span class="v">${cur ? esc(mName(cur.member_id)) : 'Free'}</span><span class="h">${cur ? 'Until ' + (sameDay(new Date(cur.end_at), now) ? fmtTime(new Date(cur.end_at)) : fmtDayShort(new Date(cur.end_at))) : nxt ? 'Next: ' + esc(mName(nxt.member_id)) + ', ' + relDay(new Date(nxt.start_at)).replace(/^(Today|Tomorrow)$/, m => m.toLowerCase()) + ' ' + fmtTime(new Date(nxt.start_at)) : 'Nothing booked'}</span></button>`);
  }
  return tiles.length ? `<section class="glance" aria-label="At a glance">${tiles.join('')}</section>` : '';
}
function evRow(e, showDay) {
  if (e.kind === 'bin') return `<div class="row" data-act="bins" style="cursor:pointer"><span class="evbar" style="background:${esc(e.colour)}"></span>
    <div class="main"><div class="t">${esc(e.bin.type.name)}</div><div class="m">${showDay ? relDay(e.start) + ' · ' : ''}${esc(e.bin.type.what || 'Bin day')}${e.bin.moved ? ' · moved' : ''}</div></div><span class="small muted">Bins</span></div>`;
  const time = e.allDay ? 'All day' : fmtTime(e.start);
  const who = e.kind === 'family' ? ((e.ev.who || []).length ? avStack(e.ev.who.concat(calOwners(e))) : '<span class="small muted">Everyone</span>')
    : e.cals.length > 1 ? (avStack(calOwners(e)) || `<span class="ev-src small muted">${e.cals.length} calendars</span>`) : `<span class="ev-src small muted">${esc(e.cal.name)}</span>`;
  const loc = e.kind === 'family' ? e.ev.location : e.x.location;
  return `<div class="row" data-act="${e.kind === 'family' ? 'edit-event' : 'view-linked'}" data-id="${e.kind === 'family' ? e.ev.id : ''}" data-cal="${e.kind === 'linked' ? e.cal.id : ''}" data-start="${+e.start}" style="cursor:pointer">
    <span class="evbar" style="background:${esc(e.colour)}"></span>
    <div class="main"><div class="t">${esc(e.title)}</div><div class="m">${showDay ? relDay(e.start) + ' · ' : ''}${time}${!e.allDay ? '–' + fmtTime(e.end) : ''}${loc ? ' · ' + esc(loc) : ''}</div></div>
    ${who}</div>`;
}
function bookRow(b) {
  const f = S.facilities.find(x => x.id === b.facility_id) || {};
  const s = new Date(b.start_at), e = new Date(b.end_at);
  const span = sameDay(s, e) || (+e === +sod(e) && sameDay(s, addDays(e, -1))) ? `${relDay(s)} · ${fmtTime(s)}–${fmtTime(e)}` : `${fmtDayShort(s)} ${fmtTime(s)} → ${fmtDayShort(e)} ${fmtTime(e)}`;
  return `<div class="row" data-act="edit-booking" data-id="${b.id}" style="cursor:pointer">
    <span class="evbar" style="background:${esc(f.colour || '#3B6A50')}"></span>
    <div class="main"><div class="t">${esc(f.name || 'Deleted item')}</div><div class="m">${span}${b.note ? ' · ' + esc(b.note) : ''}</div></div>${avatar(b.member_id)}</div>`;
}

/* ---------- Lists ---------- */
function currentList() { return S.lists.find(l => l.id === S.listId) || S.lists[0] || null; }
function viewLists() {
  const l = currentList();
  const chips = S.lists.map(x => {
    const n = S.items.filter(i => i.list_id === x.id && !i.done && !i.cleared).length;
    return `<button class="chip ${l && x.id === l.id ? 'on' : ''}" data-act="open-list" data-id="${x.id}">${esc(x.name)}${n ? `<span class="n">${n}</span>` : ''}</button>`;
  }).join('') + `<button class="chip" data-act="new-list">${I.plus.replace('<svg', '<svg width="16" height="16"')} New list</button>`;
  if (!l) return `<div class="page-h"><h1>Lists</h1></div><div class="chips">${chips}</div><div class="card empty"><b>No lists yet</b>Start with a shopping list.</div>`;
  const items = S.items.filter(i => i.list_id === l.id && !i.cleared);
  const open = items.filter(i => !i.done).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const done = items.filter(i => i.done).sort((a, b) => new Date(b.done_at || 0) - new Date(a.done_at || 0));
  // "Buy again": things ticked off before on this list that aren't on it now, most frequent first
  const openNames = new Set(items.map(i => i.text.toLowerCase())); // anything still on the list, ticked or not
  const freq = {};
  S.items.filter(i => i.list_id === l.id && (i.done || i.cleared)).forEach(i => { const k = i.text.trim(); if (!openNames.has(k.toLowerCase())) freq[k] = (freq[k] || 0) + 1; });
  const again = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
  let body = '';
  if (!open.length) body = `<div class="empty"><b>${l.kind === 'shopping' ? 'Nothing to buy' : 'All done'}</b>Type above to add something.</div>`;
  else if (l.kind === 'shopping') {
    const groups = {}; open.forEach(i => (groups[i.category || 'Other'] = groups[i.category || 'Other'] || []).push(i));
    body = CAT_ORDER.filter(c => groups[c]).map(c => `<div class="cat">${esc(c)}</div>${groups[c].map(itemRow).join('')}`).join('');
  } else body = open.map(itemRow).join('');
  return `
  <div class="page-h"><h1>${esc(l.name)}</h1><button class="icon-btn" data-act="list-menu" data-id="${l.id}" aria-label="List options" style="margin-left:auto">${I.dots}</button></div>
  <div class="chips">${chips}</div>
  <form class="addbar" data-form="add-item" autocomplete="off">
    <label class="sr" for="newItem">Add to ${esc(l.name)}</label>
    <input id="newItem" name="text" type="text" placeholder="${l.kind === 'shopping' ? 'Add an item, e.g. plantain' : 'Add a task'}" enterkeyhint="done" maxlength="120">
    ${l.kind === 'shopping' ? `<button class="btn ghost scanbtn" type="button" data-act="scan" data-id="${l.id}" aria-label="Scan a barcode" title="Scan a barcode">${I.scan}</button>` : ''}
    <button class="btn" type="submit" aria-label="Add">${I.plus}</button>
  </form>
  ${again.length ? `<div class="suggest" aria-label="Add again">${again.map(t => `<button data-act="again" data-text="${esc(t)}">+ ${esc(t)}</button>`).join('')}</div>` : ''}
  <div class="card">${body}
  ${done.length ? `<div class="done-h"><button class="tog" data-act="toggle-done">${S.showDone ? '▾' : '▸'} ${l.kind === 'shopping' ? 'In the trolley' : 'Done'} (${done.length})</button><button class="btn sm ghost" data-act="clear-done">Clear</button></div>${S.showDone ? done.map(itemRow).join('') : ''}` : ''}
  </div>`;
}
function itemRow(i) {
  const meta = i.done ? `Ticked by ${esc(mName(i.done_by))} · ${ago(i.done_at)}` : `${esc(mName(i.added_by))} · ${ago(i.created_at)}${i.note ? ' · ' + esc(i.note) : ''}`;
  return `<div class="item ${i.done ? 'done' : ''}"><button class="tick" data-act="tick" data-id="${i.id}" aria-label="${i.done ? 'Untick' : 'Tick'} ${esc(i.text)}">${I.check}</button>
    <button class="txt" data-act="edit-item" data-id="${i.id}"><span class="t">${esc(i.text)}</span><span class="m">${meta}</span></button></div>`;
}

/* ---------- Calendar ---------- */
function viewCalendar() {
  const m = S.calMonth, first = new Date(m.getFullYear(), m.getMonth(), 1);
  const gridStart = addDays(first, -((first.getDay() + 6) % 7));
  const gridEnd = addDays(gridStart, 42);
  const evs = eventsBetween(gridStart, gridEnd);
  const today = sod(new Date());
  const filters = [`<button class="chip ${S.hidden.has('m:everyone') ? 'off' : ''}" data-act="filter" data-key="m:everyone"><span class="sw" style="background:#D9A441"></span>Everyone</button>`]
    .concat(S.members.map(x => `<button class="chip ${S.hidden.has('m:' + x.id) ? 'off' : ''}" data-act="filter" data-key="m:${x.id}"><span class="sw" style="background:${esc(x.colour)}"></span>${esc(x.name)}</button>`))
    .concat(S.calendars.filter(c => c.visible !== false).map(c => `<button class="chip ${S.hidden.has('c:' + c.id) ? 'off' : ''}" data-act="filter" data-key="c:${c.id}" title="Linked calendar"><span class="sw" style="background:${esc(c.colour)};border-radius:3px"></span>${esc(c.name)}${S.extStatus[c.id] === 'error' ? ' ⚠' : ''}</button>`))
    .concat(binsCfg() ? [`<button class="chip ${S.hidden.has('bins') ? 'off' : ''}" data-act="filter" data-key="bins"><span class="sw" style="background:${esc(binsCfg().types[0].colour)}"></span>Bins</button>`] : []).join('');
  const head = `<div class="cal-h"><h1>${S.calView === 'month' ? first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Agenda'}</h1>
    ${S.calView === 'month' ? `<button class="icon-btn" data-act="cal-prev" aria-label="Previous month">${I.left}</button><button class="btn sm ghost" data-act="cal-today">Today</button><button class="icon-btn" data-act="cal-next" aria-label="Next month">${I.right}</button>` : ''}
    <div class="seg" role="tablist"><button class="${S.calView === 'month' ? 'on' : ''}" data-act="cal-view" data-v="month">Month</button><button class="${S.calView === 'agenda' ? 'on' : ''}" data-act="cal-view" data-v="agenda">Agenda</button></div></div>
    <div class="chips">${filters}</div>`;
  if (S.calView === 'agenda') {
    const list = eventsBetween(today, addDays(today, 60));
    const byDay = {};
    list.forEach(e => { for (let d = sod(e.start < today ? today : e.start); d < e.end && d < addDays(today, 60); d = addDays(d, 1)) { (byDay[ymd(d)] = byDay[ymd(d)] || []).push(e); if (!e.allDay) break; } });
    const keys = Object.keys(byDay).sort();
    return head + (keys.length ? keys.map(k => `<div class="agenda-day"><h3 class="${k === ymd(today) ? 'today' : ''}">${relDay(parseYmd(k))}</h3>${byDay[k].map(evCard).join('')}</div>`).join('') : `<div class="card empty"><b>Nothing in the next 60 days</b>Tap + to add something.</div>`);
  }
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i), list = onDay(evs, d);
    const cls = ['day', d.getMonth() !== m.getMonth() ? 'other' : '', sameDay(d, today) ? 'today' : '', sameDay(d, S.calDay) ? 'sel' : ''].join(' ');
    cells += `<button class="${cls}" data-act="cal-day" data-d="${ymd(d)}" aria-label="${fmtDayLong(d)}, ${list.length} events"><span class="num">${d.getDate()}</span>
      <span class="dots">${list.slice(0, 4).map(e => `<i style="background:${esc(e.colour)}"></i>`).join('')}</span>
      ${list.slice(0, 3).map(e => `<span class="lbl" style="background:${esc(e.colour)}22;color:var(--ink);box-shadow:inset 3px 0 0 ${esc(e.colour)}">${e.allDay ? '' : fmtTime(e.start) + ' '}${esc(e.title)}</span>`).join('')}
      ${list.length > 3 ? `<span class="more">+${list.length - 3} more</span>` : ''}</button>`;
  }
  const dayList = onDay(eventsBetween(S.calDay, addDays(S.calDay, 1)), S.calDay);
  return head + `<div class="cal-wrap">
    <div class="month"><div class="dow">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<span>${x}</span>`).join('')}</div><div class="days">${cells}</div></div>
    <div><div class="agenda-day"><h3 class="${sameDay(S.calDay, today) ? 'today' : ''}">${relDay(S.calDay)}</h3>
      ${dayList.length ? dayList.map(evCard).join('') : `<div class="card empty">Nothing on.<br><br><button class="btn sm" data-act="new-event" data-d="${ymd(S.calDay)}">${I.plus} Add to this day</button></div>`}</div></div>
  </div>`;
}
function evCard(e) {
  if (e.kind === 'bin') return `<button class="ev" data-act="bins"><span class="evbar" style="background:${esc(e.colour)}"></span><span class="when">All day</span>
    <span class="main"><span class="t">${esc(e.bin.type.name)}</span><span class="src">Bins</span><br><span class="m">${esc(e.bin.type.what || '')}${e.bin.moved ? ' · moved' : ''}</span></span></button>`;
  const fam = e.kind === 'family';
  const who = fam ? ((e.ev.who || []).length ? [...new Set(e.ev.who.concat(calOwners(e)))].map(mName).join(', ') : 'Everyone')
    : e.cals.length > 1 ? [...new Set(calOwners(e))].map(mName).join(', ') : '';
  const loc = fam ? e.ev.location : e.x.location;
  return `<button class="ev" data-act="${fam ? 'edit-event' : 'view-linked'}" data-id="${fam ? e.ev.id : ''}" data-cal="${fam ? '' : e.cal.id}" data-start="${+e.start}">
    <span class="evbar" style="background:${esc(e.colour)}"></span>
    <span class="when">${e.allDay ? 'All day' : fmtTime(e.start)}${!e.allDay ? `<small>${fmtTime(e.end)}</small>` : ''}</span>
    <span class="main"><span class="t">${esc(e.title)}</span>${fam ? '' : `<span class="src">${e.cals.length > 1 ? e.cals.length + ' calendars' : esc(e.cal.name)}</span>`}<br><span class="m">${[who, loc].filter(Boolean).map(esc).join(' · ')}</span></span>${!fam && e.cals.length > 1 ? avStack(calOwners(e)) : ''}</button>`;
}

/* ---------- Bookings ---------- */
const DAY_FROM = 6, DAY_TO = 23;
function viewBookings() {
  if (!S.facilities.length) return `<div class="page-h"><h1>Bookings</h1><div class="sub">Share the family car, the spare room, a holiday home… and stop double-booking it.</div></div>
    <div class="card empty"><b>Nothing to book yet</b>Add the first thing the family shares.<br><br><button class="btn" data-act="new-facility">${I.plus} Add something to book</button></div>`;
  const f = S.facilities.find(x => x.id === S.facilityId) || S.facilities[0];
  S.facilityId = f.id;
  const d = S.bookDay, dEnd = addDays(d, 1);
  const todays = S.bookings.filter(b => b.facility_id === f.id && new Date(b.start_at) < dEnd && new Date(b.end_at) > d).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  const span = (DAY_TO - DAY_FROM) * 60;
  const pos = t => Math.max(0, Math.min(100, ((t.getHours() + t.getMinutes() / 60 - DAY_FROM) * 60) / span * 100));
  const blocks = todays.map(b => {
    const s = new Date(b.start_at) < d ? at(ymd(d), pad(DAY_FROM) + ':00') : new Date(b.start_at);
    const e = new Date(b.end_at) > dEnd ? at(ymd(d), DAY_TO + ':00') : new Date(b.end_at);
    const l = pos(s), w = Math.max(2, pos(e) - l);
    return `<span class="blk" style="left:${l}%;width:${w}%;background:${esc(mColour(b.member_id))}" title="${esc(mName(b.member_id))}">${esc(mName(b.member_id))}</span>`;
  }).join('');
  const now = new Date();
  const nowLine = sameDay(now, d) && now.getHours() >= DAY_FROM && now.getHours() < DAY_TO ? `<span class="now" style="left:${pos(now)}%"></span>` : '';
  const upcoming = S.bookings.filter(b => new Date(b.end_at) > now).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)).slice(0, 8);
  return `<div class="page-h"><h1>Bookings</h1></div>
  <div class="chips">${S.facilities.map(x => `<button class="chip ${x.id === f.id ? 'on' : ''}" data-act="pick-facility" data-id="${x.id}"><span class="sw" style="background:${esc(x.colour)}"></span>${esc(x.name)}</button>`).join('')}<button class="chip" data-act="new-facility">${I.plus.replace('<svg', '<svg width="16" height="16"')} Add</button></div>
  <div class="grid2">
  <section class="card">
    <h2><span class="dot" style="background:${esc(f.colour)}"></span>${esc(f.name)}<button class="more" data-act="edit-facility" data-id="${f.id}">Edit</button></h2>
    ${f.note ? `<p class="small muted" style="margin:-4px 0 10px">${esc(f.note)}</p>` : ''}
    <div class="daynav"><button class="icon-btn" data-act="book-prev" aria-label="Previous day">${I.left}</button><span class="d">${relDay(d)}</span><button class="icon-btn" data-act="book-next" aria-label="Next day">${I.right}</button></div>
    <div class="strip" aria-hidden="true">${blocks}${nowLine}</div>
    <div class="ticks"><span>6am</span><span>9am</span><span>12pm</span><span>3pm</span><span>6pm</span><span>9pm</span><span>11pm</span></div>
    <div style="margin-top:10px">${todays.length ? todays.map(bookRow).join('') : `<div class="empty">Free all day.</div>`}</div>
    <div class="actions"><button class="btn grow" data-act="new-booking">${I.plus} Book ${esc(f.name)}</button></div>
  </section>
  <section class="card"><h2><span class="dot" style="background:var(--indigo)"></span>All upcoming bookings</h2>
    ${upcoming.length ? upcoming.map(bookRow).join('') : `<div class="empty">Nothing booked.</div>`}</section>
  </div>`;
}

/* ---------- Family / settings ---------- */
function viewMore() {
  const calHelp = '';
  return `<div class="page-h"><h1>Family</h1></div>
  <div class="grid2"><div class="settings-sec">
    <h2>You</h2>
    <div class="card">${S.me ? `<div class="row">${avatar(S.me.id, 'lg')}<div class="main"><div class="t">${esc(S.me.name)}</div><div class="m">${FAMILY_MODE ? esc(S.user.email) : 'Using this device'}</div></div>
      ${FAMILY_MODE ? `<button class="btn sm ghost" data-act="sign-out">Sign out</button>` : `<button class="btn sm ghost" data-act="switch-me">Switch</button>`}</div>${FAMILY_MODE ? `<div class="actions" style="margin-top:6px"><button class="btn sm ghost" data-act="change-password">Change password</button></div>` : ''}` : ''}</div>
    <h2>Family members</h2>
    <div class="card">${S.members.map(m => `<div class="row" ${isAdmin() ? `data-act="edit-member" data-id="${m.id}" style="cursor:pointer"` : ''}>${avatar(m.id)}<div class="main"><div class="t">${esc(m.name)}${m.is_admin ? ' <span class="small muted">· admin</span>' : ''}</div><div class="m">${esc(m.email || 'No email')}</div></div></div>`).join('')}
      ${isAdmin() ? `<div class="actions"><button class="btn sm" data-act="new-member">${I.plus} Add family member</button></div>` : '<p class="small muted">Ask an admin to add or change family members.</p>'}</div>
    <h2>Linked calendars</h2>
    <div class="card">${S.calendars.length ? S.calendars.map(c => `<div class="row" data-act="edit-calendar" data-id="${c.id}" style="cursor:pointer"><span class="evbar" style="background:${esc(c.colour)}"></span><div class="main"><div class="t">${esc(c.name)}</div><div class="m">${c.visible === false ? 'Hidden' : ({ ok: 'Up to date', stale: 'Couldn’t refresh, showing the last copy', error: 'Couldn’t load: check the link' }[S.extStatus[c.id]] || 'Loading…')}</div></div></div>`).join('') : `<p class="small muted" style="margin-top:0">Show your Google, Outlook, Apple or school calendars alongside the family calendar. Takes about a minute each.</p>`}
      ${calHelp}
      <div class="actions"><button class="btn sm" data-act="new-calendar">${I.link} Link a calendar</button>${S.calendars.length ? `<button class="btn sm ghost" data-act="refresh-cals">Refresh now</button>` : ''}</div></div>
  </div><div class="settings-sec">
    <h2>Things to book</h2>
    <div class="card">${S.facilities.length ? S.facilities.map(f => `<div class="row" data-act="edit-facility" data-id="${f.id}" style="cursor:pointer"><span class="evbar" style="background:${esc(f.colour)}"></span><div class="main"><div class="t">${esc(f.name)}</div><div class="m">${esc(f.note || '')}</div></div></div>`).join('') : '<p class="small muted" style="margin-top:0">Nothing yet.</p>'}
      <div class="actions"><button class="btn sm" data-act="new-facility">${I.plus} Add something to book</button></div></div>
    <h2>Bin day</h2>
    <div class="card">${binsCfg() ? (b => `<div class="row" data-act="bins" style="cursor:pointer">${b ? `<span class="evbar" style="background:${esc(b.type.colour)}"></span><div class="main"><div class="t">Next: ${esc(b.type.name)}</div><div class="m">${relDay(b.date)} · ${esc(b.type.what || '')}</div></div>` : '<div class="main"><div class="t">No collections in the next few weeks</div></div>'}</div>`)(nextBin(binsCfg())) : '<p class="small" style="margin-top:0">Add your council’s collection days and Somasu shows which bin goes out, on Home and in the calendar, with a reminder the evening before.</p>'}
      ${isAdmin() ? `<div class="actions"><button class="btn sm ${binsCfg() ? 'ghost' : ''}" data-act="edit-bins">${binsCfg() ? 'Change bin day' : 'Set up bin day'}</button></div>` : ''}</div>
    <h2>Notifications</h2>
    ${notifySection()}
    <h2>Install on your phone or computer</h2>
    <div class="card"><details class="howto"><summary>iPhone or iPad</summary><ol><li>Open this page in Safari.</li><li>Tap the Share button, then <b>Add to Home Screen</b>.</li></ol></details>
      <details class="howto"><summary>Android</summary><ol><li>Open this page in Chrome.</li><li>Tap ⋮ then <b>Install app</b> (or <b>Add to Home screen</b>).</li></ol></details>
      <details class="howto"><summary>Windows, Mac or Linux</summary><ol><li>Open this page in Chrome or Edge.</li><li>Click the install icon at the right of the address bar (or ⋮ › <b>Install Somasu</b>).</li></ol></details>
      ${deferredInstall ? `<div class="actions"><button class="btn sm" data-act="install">Install now</button></div>` : ''}</div>
    ${isAdmin() ? `<h2>Problem reports</h2>
    <div class="card"><p class="small" style="margin-top:0">When someone taps <b>Report a problem</b>, the email goes to <b>${esc(supportEmail())}</b>.</p>
      <div class="actions"><button class="btn sm ghost" data-act="edit-support">Change</button></div></div>` : ''}
    <h2>Your data</h2>
    <div class="card"><p class="small" style="margin-top:0">${FAMILY_MODE ? '<b>Family mode.</b> Everything is saved in the family database and shared live with every signed-in family member.' : '<b>Try-out mode.</b> Everything is saved in this browser only. Nothing is shared until the family database is connected.'}</p>
      <div class="actions"><button class="btn sm ghost" data-act="export">${I.dl} Download a backup</button>${!FAMILY_MODE ? `<button class="btn sm ghost" data-act="reset-sample">Start again with sample data</button>` : ''}</div></div>
    <p class="small muted ver" style="text-align:center">Somasu · ${verHtml()}<br><a href="#" data-act="help">Help and guides</a> · <a href="#" data-act="report">Report a problem</a></p>
  </div></div>`;
}

/* ------------------------------------------------------------------ forms */
const REMIND = [['', 'No reminder'], ['0', 'When it starts'], ['15', '15 minutes before'], ['30', '30 minutes before'], ['60', '1 hour before'], ['120', '2 hours before'], ['1440', '1 day before'], ['10080', '1 week before']];
// current = the saved colour (kept even if it isn't in the list any more); fallback = suggestion for a new one.
const colourPicker = (name, current, fallback) => {
  const pick = current || fallback || COLOURS[0], list = COLOURS.includes(pick) ? COLOURS : [pick].concat(COLOURS);
  return `<div class="swatches" role="radiogroup">${list.map(c => { const n = COLOUR_NAMES[c] || 'Current colour'; return `<label style="background:${c}" title="${n}"><input type="radio" name="${name}" value="${c}" ${c === pick ? 'checked' : ''} aria-label="${n}"><span class="sr">${n}</span></label>`; }).join('')}</div>`;
};
// The first colour nobody in the family is using yet, so new people stand out.
const freeColour = () => COLOURS.find(c => !S.members.some(m => (m.colour || '').toUpperCase() === c)) || COLOURS[S.members.length % COLOURS.length];
const memberPick = (name, chosen, multi) => `<div class="pick">${S.members.map(m => `<label><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${m.id}" ${chosen.includes(m.id) ? 'checked' : ''}>${avatar(m.id)}${esc(m.name)}</label>`).join('')}</div>`;
const formVal = (f, n) => (f.elements[n] ? f.elements[n].value : '').trim();
function showErr(form, msg) { let e = form.querySelector('.err'); if (!e) { e = document.createElement('div'); e.className = 'err'; form.prepend(e); } e.textContent = msg; e.scrollIntoView({ block: 'nearest' }); }

function eventForm(ev, presetDay, occStart) {
  const isNew = !ev;
  const now = new Date();
  let start, end;
  if (ev) { start = new Date(ev.start_at); end = new Date(ev.end_at); if (ev.all_day) end = addDays(end, -1); }
  else {
    const d = presetDay || S.calDay || sod(now);
    start = at(ymd(d), sameDay(d, now) ? pad(Math.min(22, now.getHours() + 1)) + ':00' : '09:00');
    end = new Date(+start + 3600000);
  }
  const allDay = ev ? ev.all_day : false;
  const rep = ev ? ev.repeat : 'none';
  modal(isNew ? 'New event' : 'Edit event', `<form data-form="event" data-id="${ev ? ev.id : ''}" autocomplete="off">
    <div class="f"><label for="evT">What</label><input id="evT" type="text" name="title" required maxlength="120" value="${esc(ev ? ev.title : '')}" placeholder="e.g. Grandma's birthday"></div>
    <div class="f"><label class="toggle"><input type="checkbox" name="all_day" ${allDay ? 'checked' : ''} data-act="allday-toggle"> All day</label></div>
    <div class="f2"><div class="f"><label>Starts</label><input type="date" name="sd" value="${ymd(start)}" required></div><div class="f tm ${allDay ? 'hidden' : ''}"><label>Time</label><input type="time" name="st" value="${hm(start)}"></div></div>
    <div class="f2"><div class="f"><label>Ends</label><input type="date" name="ed" value="${ymd(end)}" required></div><div class="f tm ${allDay ? 'hidden' : ''}"><label>Time</label><input type="time" name="et" value="${hm(end)}"></div></div>
    <div class="f"><span class="lab">Who's it for? <span class="muted" style="font-weight:500">(leave blank for everyone)</span></span>${memberPick('who', ev ? ev.who || [] : [], true)}</div>
    <div class="f"><label for="evL">Where</label><input id="evL" type="text" name="location" maxlength="160" value="${esc(ev ? ev.location : '')}"></div>
    <div class="f2"><div class="f"><label>Repeats</label><select name="repeat">${[['none', 'Never'], ['daily', 'Every day'], ['weekly', 'Every week'], ['fortnightly', 'Every 2 weeks'], ['monthly', 'Every month'], ['yearly', 'Every year']].map(([v, l]) => `<option value="${v}" ${rep === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="f"><label>Until <span class="muted" style="font-weight:500">(optional)</span></label><input type="date" name="until" value="${ev && ev.repeat_until ? ev.repeat_until : ''}"></div></div>
    <div class="f"><label>Remind ${'whoever it’s for'}</label><select name="remind">${REMIND.map(([v, l]) => `<option value="${v}" ${String(ev && ev.remind_minutes != null ? ev.remind_minutes : '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <div class="hint">Sent as a notification to anyone who has turned notifications on.</div></div>
    <div class="f"><label for="evN">Notes</label><textarea id="evN" name="notes" maxlength="1000">${esc(ev ? ev.notes : '')}</textarea></div>
    <div class="actions">
      ${!isNew ? `<button type="button" class="btn danger" data-act="delete-event" data-id="${ev.id}" data-occ="${occStart || ''}">Delete</button>` : ''}
      ${!isNew ? `<button type="button" class="btn ghost" data-act="ics-event" data-id="${ev.id}" title="Add to your own phone calendar">${I.dl} My calendar</button>` : ''}
      <button class="btn dark grow" type="submit">${isNew ? 'Add to calendar' : 'Save'}</button></div>
    ${!isNew ? `<p class="small muted">Added by ${esc(mName(ev.created_by))}</p>` : ''}
  </form>`);
}
function itemForm(i) {
  const l = S.lists.find(x => x.id === i.list_id) || {};
  modal('Edit item', `<form data-form="item" data-id="${i.id}" autocomplete="off">
    <div class="f"><label for="itT">Item</label><input id="itT" type="text" name="text" required maxlength="120" value="${esc(i.text)}"></div>
    ${l.kind === 'shopping' ? `<div class="f"><label>Aisle</label><select name="category">${CAT_ORDER.map(c => `<option ${c === (i.category || 'Other') ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>` : ''}
    <div class="f"><label for="itN">Note <span class="muted" style="font-weight:500">(brand, size, how many)</span></label><input id="itN" type="text" name="note" maxlength="160" value="${esc(i.note || '')}"></div>
    <div class="f"><label>List</label><select name="list_id">${S.lists.map(x => `<option value="${x.id}" ${x.id === i.list_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
    <div class="actions"><button type="button" class="btn danger" data-act="delete-item" data-id="${i.id}">Remove</button>${l.kind === 'shopping' ? `<a class="btn ghost" href="${esc(priceUrl(i.text))}" target="_blank" rel="noopener noreferrer">Compare prices</a>` : ''}<button class="btn dark grow" type="submit">Save</button></div>
    <p class="small muted">Added by ${esc(mName(i.added_by))} · ${ago(i.created_at)}</p></form>`);
}
function listForm(l) {
  modal(l ? 'List settings' : 'New list', `<form data-form="list" data-id="${l ? l.id : ''}" autocomplete="off">
    <div class="f"><label for="lN">Name</label><input id="lN" type="text" name="name" required maxlength="60" value="${esc(l ? l.name : '')}" placeholder="e.g. Costco run, Christmas, Holiday packing"></div>
    <div class="f"><span class="lab">Type</span><div class="pick"><label><input type="radio" name="kind" value="shopping" ${!l || l.kind === 'shopping' ? 'checked' : ''}>🛒 Shopping (sorted by aisle)</label><label><input type="radio" name="kind" value="todo" ${l && l.kind === 'todo' ? 'checked' : ''}>✓ To-do or checklist</label></div></div>
    <div class="actions">${l ? `<button type="button" class="btn danger" data-act="delete-list" data-id="${l.id}">Delete list</button>` : ''}<button class="btn dark grow" type="submit">${l ? 'Save' : 'Create list'}</button></div></form>`);
}
function bookingForm(b) {
  const f = b ? S.facilities.find(x => x.id === b.facility_id) : S.facilities.find(x => x.id === S.facilityId) || S.facilities[0];
  const now = new Date();
  let s, e;
  if (b) { s = new Date(b.start_at); e = new Date(b.end_at); }
  else { const d = S.bookDay; s = at(ymd(d), sameDay(d, now) ? pad(Math.min(22, now.getHours() + 1)) + ':00' : '09:00'); e = new Date(+s + 2 * 3600000); }
  modal(b ? 'Edit booking' : 'New booking', `<form data-form="booking" data-id="${b ? b.id : ''}" autocomplete="off">
    <div class="f"><label>What</label><select name="facility_id">${S.facilities.map(x => `<option value="${x.id}" ${f && x.id === f.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
    <div class="f"><span class="lab">Who's booking</span>${memberPick('member_id', [b ? b.member_id : (S.me && S.me.id)], false)}</div>
    <div class="f2"><div class="f"><label>From</label><input type="date" name="sd" value="${ymd(s)}" required></div><div class="f"><label>Time</label><input type="time" name="st" value="${hm(s)}" required></div></div>
    <div class="f2"><div class="f"><label>Until</label><input type="date" name="ed" value="${ymd(e)}" required></div><div class="f"><label>Time</label><input type="time" name="et" value="${hm(e)}" required></div></div>
    <div class="f"><label for="bN">Note</label><input id="bN" type="text" name="note" maxlength="160" value="${esc(b ? b.note : '')}" placeholder="e.g. Taking it to Oxford"></div>
    <div class="actions">${b ? `<button type="button" class="btn danger" data-act="delete-booking" data-id="${b.id}">Cancel booking</button>` : ''}<button class="btn dark grow" type="submit">${b ? 'Save' : 'Book it'}</button></div></form>`);
}
function facilityForm(f) {
  modal(f ? 'Edit' : 'Add something to book', `<form data-form="facility" data-id="${f ? f.id : ''}" autocomplete="off">
    <div class="f"><label for="fN">Name</label><input id="fN" type="text" name="name" required maxlength="60" value="${esc(f ? f.name : '')}" placeholder="e.g. Family car, Spare room, Holiday home"></div>
    <div class="f"><label for="fD">Note <span class="muted" style="font-weight:500">(optional)</span></label><input id="fD" type="text" name="note" maxlength="160" value="${esc(f ? f.note : '')}" placeholder="e.g. Keys in the kitchen drawer"></div>
    <div class="f"><span class="lab">Colour</span>${colourPicker('colour', f && f.colour)}</div>
    <div class="actions">${f ? `<button type="button" class="btn danger" data-act="delete-facility" data-id="${f.id}">Delete</button>` : ''}<button class="btn dark grow" type="submit">Save</button></div></form>`);
}
function memberForm(m) {
  modal(m ? 'Edit family member' : 'Add family member', `<form data-form="member" data-id="${m ? m.id : ''}" autocomplete="off">
    <div class="f"><label for="mN">Name</label><input id="mN" type="text" name="name" required maxlength="40" value="${esc(m ? m.name : '')}"></div>
    <div class="f"><label for="mE">Email</label><input id="mE" type="email" name="email" ${FAMILY_MODE ? 'required' : ''} maxlength="120" value="${esc(m ? m.email : '')}">
      <div class="hint">${FAMILY_MODE ? 'They sign in with this address.' : 'Used for sign-in once the family database is connected.'}</div></div>
    ${FAMILY_MODE ? `<div class="f"><label for="mP">${m ? 'New starting password' : 'Starting password'}</label>${pwBox('mP', 'password', 'new-password', !m)}
      <button type="button" class="btn sm ghost" data-act="gen-pw" style="margin-top:6px">Make one for me</button>
      <div class="hint">${m ? 'Only if they’ve forgotten theirs: leave blank to keep their current password.' : 'Somasu sets up their sign-in with this. Give it to them in person or by text; they can change it under Family › Change password.'}</div><div class="mpcheck"></div></div>` : ''}
    <div class="f"><span class="lab">Colour</span>${colourPicker('colour', m && m.colour, freeColour())}</div>
    <div class="f"><label class="toggle"><input type="checkbox" name="is_admin" ${m && m.is_admin ? 'checked' : ''}> Admin (can add and change family members)</label><div class="hint">Leave this off for everyone else: they can use all of Somasu but can’t change the family list.</div></div>
    <div class="actions">${m ? `<button type="button" class="btn danger" data-act="delete-member" data-id="${m.id}">Remove</button>` : ''}<button class="btn dark grow" type="submit">Save</button></div></form>`);
  const pw = $('#mP'), chk = document.querySelector('.mpcheck');
  if (pw && chk) pw.addEventListener('input', () => { chk.innerHTML = pw.value ? pwChecklist(pw.value) : ''; });
}
// A starting password that meets the rules and is easy to read out: Word-Word-00.
function makePassword() {
  const W = ['Maple', 'River', 'Sunny', 'Cedar', 'Amber', 'Robin', 'Harbour', 'Meadow', 'Willow', 'Copper', 'Garden', 'Silver', 'Lantern', 'Orchard', 'Pebble', 'Thistle'];
  const r = new Uint32Array(3); crypto.getRandomValues(r);
  return `${W[r[0] % W.length]}-${W[r[1] % W.length].toLowerCase()}-${10 + r[2] % 90}`;
}
// Sign-ins are made, changed and removed on the server (the secret key never reaches the app).
async function memberLogin(action, body) {
  const r = await fetch('/api/member-login', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, await authHeader()), body: JSON.stringify(Object.assign({ action }, body)) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Somasu couldn’t reach its sign-in service (error ' + r.status + ').');
  return j;
}
/* ---- Link a calendar: pick the service, follow 2-3 steps, paste, done ---- */
const CAL_PROVIDERS = [
  { id: 'google', name: 'Google', sub: 'Gmail and Google accounts', letter: 'G', colour: '#3B6FC9',
    open: 'https://calendar.google.com/calendar/u/0/r/settings', openLabel: 'Open Google Calendar settings',
    steps: ['Tap the button below. A computer is easiest: the Google Calendar phone app doesn’t show this setting, but your phone’s web browser does.',
      'On the left, under <b>Settings for my calendars</b>, click the calendar you want.',
      'Scroll down to <b>Secret address in iCal format</b>, click the copy icon, then come back here and tap <b>Paste</b>.'] },
  { id: 'outlook', name: 'Outlook', sub: 'Outlook, Hotmail, Microsoft 365', letter: 'O', colour: '#2563A8',
    open: 'https://outlook.live.com/calendar/0/options/calendar/SharedCalendars', openLabel: 'Open Outlook calendar sharing',
    steps: ['Tap the button below and sign in. (Work or school account? Use outlook.office.com › Settings › Calendar › Shared calendars.)',
      'Under <b>Publish a calendar</b>, pick the calendar and <b>Can view all details</b>, then <b>Publish</b>.',
      'Copy the <b>ICS</b> link (not the HTML one), come back here and tap <b>Paste</b>.'] },
  { id: 'apple', name: 'Apple iCloud', sub: 'iPhone, iPad and Mac calendars', letter: '', colour: '#5E6B64',
    steps: ['On your iPhone, open the <b>Calendar</b> app and tap <b>Calendars</b> at the bottom.',
      'Tap ⓘ next to the calendar, turn on <b>Public Calendar</b>, then tap <b>Share Link…</b> › <b>Copy</b>.',
      'Come back here and tap <b>Paste</b>.'] },
  { id: 'other', name: 'School, club or other', sub: 'Any calendar with a subscribe link', letter: '+', colour: '#3B6A50',
    steps: ['On the school or club website, look for <b>Subscribe</b>, <b>Add to calendar</b>, <b>iCal</b> or a link ending in <b>.ics</b>.',
      'Copy that link (press and hold it on a phone), come back here and tap <b>Paste</b>.'] }
];
// Friendly checks on a pasted link before we try it. Returns { url, warn } or { error }.
function checkCalLink(raw) {
  let u = (raw || '').trim().replace(/^<|>$/g, '');
  if (!u) return { error: 'Paste the calendar’s link first.' };
  u = u.replace(/^webcal:\/\//i, 'https://');
  if (/^http:\/\//i.test(u)) u = u.replace(/^http:/i, 'https:');
  if (!/^https:\/\/[^\s/]+\.[^\s/]+\//i.test(u)) return { error: 'That doesn’t look like a web link. It should start with https:// or webcal://' };
  if (/calendar\.google\.com\/calendar\/(embed|r\b|u\/\d+\/r)/i.test(u)) return { error: 'That’s the address of the Google Calendar page, not the calendar’s link. In the calendar’s settings, copy the one called “Secret address in iCal format”.' };
  if (/calendar\.google\.com/i.test(u) && /\/public\/basic\.ics/i.test(u)) return { url: u, warn: 'That’s the calendar’s public address, which only works if the calendar is set to public. If it doesn’t load, use the “Secret address in iCal format” instead.' };
  if (/outlook\.(live|office|office365)\.com/i.test(u) && /\.html(\?|$)/i.test(u)) return { error: 'That’s Outlook’s HTML link. Copy the ICS link just above or below it instead.' };
  return { url: u };
}
const nextCalColour = () => { const used = new Set(S.calendars.map(c => c.colour)); return ['#5361C2', '#2F7F86', '#A1554B', '#8E6519', '#8A5A9E', '#6B7A2E'].find(c => !used.has(c)) || '#5361C2'; };
function linkCalendarWizard(providerId) {
  const prov = CAL_PROVIDERS.find(p => p.id === providerId);
  if (!prov) {
    return modal('Link a calendar', `<p class="small" style="margin-top:0">Show your other calendars alongside family events. Where is it from?</p>
      <div class="provs">${CAL_PROVIDERS.map(p => `<button class="prov" data-act="cal-provider" data-p="${p.id}"><span class="pl" style="background:${p.colour}">${p.letter || '<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><circle cx="12" cy="12" r="5"/></svg>'}</span><span><b>${esc(p.name)}</b><small>${esc(p.sub)}</small></span>${I.right}</button>`).join('')}</div>
      <p class="small muted">Linked calendars are view-only in Somasu, refresh every 15 minutes, and everyone in the family can see them.</p>`);
  }
  modal('Link ' + prov.name + (prov.id === 'other' ? '' : ' calendar'), `<ol class="steps">${prov.steps.map(t => `<li>${t}</li>`).join('')}</ol>
    ${prov.open ? `<a class="btn ghost" style="width:100%;margin-bottom:14px" href="${prov.open}" target="_blank" rel="noopener">${I.link} ${esc(prov.openLabel)}</a>` : ''}
    <form data-form="cal-link" data-p="${prov.id}" autocomplete="off">
      <div class="f"><label for="cl">Calendar link</label><div class="paste"><input id="cl" name="url" type="url" inputmode="url" placeholder="Paste the link here">${navigator.clipboard && navigator.clipboard.readText ? '<button type="button" class="btn sm" data-act="cal-paste">Paste</button>' : ''}</div></div>
      <div id="calcheck"></div>
      <div class="actions"><button type="button" class="btn ghost" data-act="new-calendar">Back</button><button class="btn dark grow" type="submit">Check link</button></div>
    </form>`, sheet => {
    const inp = sheet.querySelector('#cl'); let t;
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { if (/^(https|webcal|http):\/\/\S{12,}/i.test(inp.value.trim())) inp.form.requestSubmit(); }, 500); });
  });
}
async function checkAndPreview(form) {
  const box = form.querySelector('#calcheck'), prov = CAL_PROVIDERS.find(p => p.id === form.dataset.p);
  const res = checkCalLink(form.elements.url.value);
  if (res.error) { box.innerHTML = `<div class="err">${esc(res.error)}</div>`; return; }
  if (S.calendars.some(c => c.url.replace(/^webcal:/i, 'https:') === res.url)) { box.innerHTML = `<div class="err">That calendar is already linked.</div>`; return; }
  box.innerHTML = `<div class="banner">Checking the link…</div>`;
  let text = null, problem = null;
  try { text = await fetchICSText(res.url); }
  catch (e) {
    problem = !FAMILY_MODE ? 'Links can’t be checked in try-out mode, but you can still add it.'
      : e.status === 401 ? 'Please sign in again, then try once more.'
      : e.status === 403 ? 'That address isn’t allowed. Check you copied the whole link.'
      : e.status === 422 ? 'That link opened, but it isn’t a calendar. Check you copied the iCal / ICS link.'
      : 'Somasu couldn’t open that link. Check you copied all of it' + (prov && prov.id === 'apple' ? ' and that Public Calendar is still on.' : '.');
  }
  const events = text ? parseICS(text) : [];
  const now = new Date(), upcoming = events.flatMap(x => occurrences(x, now, addDays(now, 60)).map(o => ({ t: x.title, s: o.start }))).sort((a, b) => a.s - b.s);
  const name = (text && icsCalName(text)) || (prov && prov.id !== 'other' ? prov.name + ' calendar' : 'Calendar');
  box.innerHTML = `${res.warn ? `<div class="banner">${esc(res.warn)}</div>` : ''}
    ${text ? `<div class="found">✓ Found <b>${esc(name)}</b>: ${events.length} event${events.length === 1 ? '' : 's'}${upcoming[0] ? `, next is ${esc(upcoming[0].t)} on ${fmtDayShort(upcoming[0].s)}` : ''}.</div>` : `<div class="${FAMILY_MODE ? 'err' : 'banner'}">${esc(problem)}</div>`}
    ${text || !FAMILY_MODE ? `<div class="f"><label for="cn2">Call it</label><input id="cn2" type="text" maxlength="40" value="${esc(name)}"></div>
      <div class="actions" style="margin-top:6px"><button type="button" class="btn grow" data-act="cal-save" data-url="${esc(res.url)}">${I.link} Link it</button></div>` : ''}`;
  box._text = text;
  const sub = form.querySelector('[type=submit]'); if (sub) sub.classList.toggle('hidden', !!(text || !FAMILY_MODE));
}
function calendarForm(c) {
  if (!c) return linkCalendarWizard(null);
  modal(c ? 'Linked calendar' : 'Link a calendar', `<form data-form="calendar" data-id="${c ? c.id : ''}" autocomplete="off">
    <div class="f"><label for="cN">Name</label><input id="cN" type="text" name="name" required maxlength="40" value="${esc(c ? c.name : '')}" placeholder="e.g. Andy's work, School term dates"></div>
    <div class="f"><label for="cU">Private iCal link</label><input id="cU" type="url" name="url" required value="${esc(c ? c.url : '')}" placeholder="https://calendar.google.com/calendar/ical/…/basic.ics">
      <div class="hint">Starts with https:// or webcal://. To link a different calendar, use Link a calendar instead.</div></div>
    <div class="f"><span class="lab">Colour</span>${colourPicker('colour', c ? c.colour : '#5361C2')}</div>
    <div class="f"><label class="toggle"><input type="checkbox" name="visible" ${!c || c.visible !== false ? 'checked' : ''}> Show in the family calendar</label></div>
    <div class="actions">${c ? `<button type="button" class="btn danger" data-act="delete-calendar" data-id="${c.id}">Unlink</button>` : ''}<button class="btn dark grow" type="submit">${c ? 'Save' : 'Link it'}</button></div></form>`);
}

/* ------------------------------------------------------------------ save handlers */
const SAVE = {
  async 'add-item'(form) {
    const text = formVal(form, 'text'); const l = currentList(); if (!text || !l) return;
    form.elements.text.value = '';
    await addItem(l, text);
  },
  async 'scan-code'(form, listId) {
    const code = formVal(form, 'code').replace(/\D/g, '');
    if (!validBarcode(code)) return showErr(form, 'That number doesn’t look right. It’s the 8 or 13 digits under the barcode.');
    scanStop(); await scanFound(code, listId);
  },
  async 'scan-add'(form, listId) {
    const text = formVal(form, 'text'); if (!text) return showErr(form, 'Give the item a name.');
    const l = S.lists.find(x => x.id === (form.elements.list_id ? formVal(form, 'list_id') : listId)); if (!l) return showErr(form, 'That list has gone.');
    const added = await addItem(l, text, { category: formVal(form, 'category'), note: formVal(form, 'note') });
    if (added !== false) { closeModal(); toast(`Added ${text} to ${l.name}`); }
  },
  async item(form, id) {
    const text = formVal(form, 'text'); if (!text) return showErr(form, 'Give the item a name.');
    const patch = { text, note: formVal(form, 'note'), list_id: formVal(form, 'list_id') };
    if (form.elements.category) patch.category = formVal(form, 'category');
    await store.update('items', id, patch); closeModal(); toast('Saved');
  },
  async list(form, id) {
    const name = formVal(form, 'name'); if (!name) return showErr(form, 'Give the list a name.');
    const kind = form.querySelector('[name=kind]:checked').value;
    if (id) await store.update('lists', id, { name, kind });
    else { const r = await store.insert('lists', { name, kind, sort: S.lists.length + 1 }); S.listId = r.id; store_set('somasu-list', r.id); }
    closeModal(); toast(id ? 'List saved' : 'List created');
  },
  async event(form, id) {
    const title = formVal(form, 'title'); if (!title) return showErr(form, 'What is it? Add a title.');
    const allDay = form.elements.all_day.checked;
    let s, e;
    if (allDay) { s = parseYmd(formVal(form, 'sd')); e = addDays(parseYmd(formVal(form, 'ed')), 1); }
    else { s = at(formVal(form, 'sd'), formVal(form, 'st') || '09:00'); e = at(formVal(form, 'ed'), formVal(form, 'et') || '10:00'); }
    if (!(e > s)) return showErr(form, 'The end needs to be after the start.');
    const row = { title, all_day: allDay, start_at: s.toISOString(), end_at: e.toISOString(), who: [...form.querySelectorAll('[name=who]:checked')].map(x => x.value), location: formVal(form, 'location'), notes: formVal(form, 'notes'), repeat: formVal(form, 'repeat'), repeat_until: formVal(form, 'until') || null, remind_minutes: formVal(form, 'remind') === '' ? null : +formVal(form, 'remind') };
    if (row.repeat === 'none') row.repeat_until = null;
    if (id) await store.update('events', id, row); else await store.insert('events', Object.assign(row, { created_by: S.me && S.me.id }));
    sendNotify({ kind: 'event', action: id ? 'changed' : 'added', title, when: whenText(s, e, allDay, row.repeat), who: row.who, url: '#calendar/' + ymd(s) });
    S.calDay = sod(s); if (S.tab === 'calendar' && S.calView === 'month') S.calMonth = sod(s);
    closeModal(); toast(id ? 'Event saved' : 'Added to the calendar');
  },
  async booking(form, id) {
    const s = at(formVal(form, 'sd'), formVal(form, 'st')), e = at(formVal(form, 'ed'), formVal(form, 'et'));
    const who = form.querySelector('[name=member_id]:checked');
    if (!who) return showErr(form, 'Who is booking?');
    if (!(e > s)) return showErr(form, 'The end needs to be after the start.');
    const fid = formVal(form, 'facility_id');
    const clash = S.bookings.find(b => b.id !== id && b.facility_id === fid && new Date(b.start_at) < e && new Date(b.end_at) > s);
    if (clash) return showErr(form, `Already booked by ${mName(clash.member_id)}, ${fmtDayShort(new Date(clash.start_at))} ${fmtTime(new Date(clash.start_at))} to ${fmtDayShort(new Date(clash.end_at))} ${fmtTime(new Date(clash.end_at))}. Pick another time, or ask them.`);
    const row = { facility_id: fid, member_id: who.value, start_at: s.toISOString(), end_at: e.toISOString(), note: formVal(form, 'note') };
    try {
      if (id) await store.update('bookings', id, row); else await store.insert('bookings', Object.assign(row, { created_by: S.me && S.me.id }));
      sendNotify({ kind: 'booking', action: id ? 'changed' : 'added', title: (S.facilities.find(x => x.id === fid) || {}).name || 'Booking', when: whenText(s, e, false), for_name: mName(row.member_id), url: '#bookings/' + fid + '/' + ymd(s) });
    } catch (err) {
      if (String(err.message || err).includes('already booked')) return showErr(form, 'Someone booked that time a moment ago. Pick another time.');
      throw err;
    }
    S.facilityId = fid; S.bookDay = sod(s);
    closeModal(); toast(id ? 'Booking saved' : 'Booked');
  },
  async facility(form, id) {
    const name = formVal(form, 'name'); if (!name) return showErr(form, 'Give it a name.');
    const row = { name, note: formVal(form, 'note'), colour: form.querySelector('[name=colour]:checked').value };
    if (id) await store.update('facilities', id, row); else { const r = await store.insert('facilities', row); S.facilityId = r.id; }
    closeModal(); toast('Saved');
  },
  async bins(form) {
    const anchor = formVal(form, 'anchor'); if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return showErr(form, 'Add one collection date from the council’s calendar.');
    const types = [0, 1].map(i => ({ name: formVal(form, 'n' + i), what: formVal(form, 'w' + i), colour: formVal(form, 'c' + i) })).filter(t => t.name);
    if (!types.length) return showErr(form, 'Give the week 1 bin a name, for example Green bin.');
    const moves = [];
    for (const line of formVal(form, 'moves').split(/\n+/).map(x => x.trim()).filter(Boolean)) {
      const [a, b = ''] = line.split(/\s*(?:->|>|→|\bto\b)\s*/i);
      const from = dmy(a), to = /^(none|no collection|cancelled|-)?$/i.test(b.trim()) ? '' : dmy(b);
      if (!from || to === null) return showErr(form, `Couldn’t read “${line}”. Write it like 24-12-2026 > 27-12-2026, or 24-12-2026 > none.`);
      moves.push({ from, to });
    }
    // The date entered may be either bin's week: turn it into the date of a week 1 collection.
    const first = Math.min(+formVal(form, 'first') || 0, types.length - 1);
    const a = first ? ymd(addDays(parseYmd(anchor), -7 * first)) : anchor;
    const cfg = { anchor: a, types, out: formVal(form, 'out'), moves, until: formVal(form, 'until'), source: formVal(form, 'source'), remind: form.elements.remind.checked };
    if (cfg.source && !/^https:\/\//i.test(cfg.source)) return showErr(form, 'The council link should start with https://');
    try { await saveSetting('bins', JSON.stringify(cfg)); } catch (e) { return showErr(form, e.message); }
    closeModal(); render();
    const b = nextBin(cfg); toast(b ? `Saved. Next: ${b.type.name}, ${relDay(b.date)}` : 'Saved');
  },
  async support(form) {
    const email = formVal(form, 'email').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr(form, 'That doesn’t look like an email address.');
    if (FAMILY_MODE) {
      const { error } = await client.from('app_settings').upsert({ key: 'support_email', value: email, updated_by: S.me && S.me.id, updated_at: new Date().toISOString() });
      if (error) return showErr(form, /app_settings|relation|schema cache|does not exist/i.test(error.message) ? 'The family database needs a small update first: run database script v5 in Supabase (Admin guide).' : 'Couldn’t save: ' + error.message);
    } else store_set('somasu-settings', Object.assign({}, store_get('somasu-settings', {}), { support_email: email }));
    S.settings = Object.assign({}, S.settings, { support_email: email });
    closeModal(); render(); toast('Problem reports now go to ' + email);
  },
  async member(form, id) {
    const name = formVal(form, 'name'); if (!name) return showErr(form, 'Add a name.');
    const email = formVal(form, 'email').toLowerCase();
    if (email && S.members.some(m => m.id !== id && (m.email || '').toLowerCase() === email)) return showErr(form, 'Someone already has that email.');
    const row = { name, email: email || null, colour: form.querySelector('[name=colour]:checked').value, is_admin: form.elements.is_admin.checked };
    if (id && S.me && id === S.me.id && !row.is_admin && S.members.filter(m => m.is_admin).length < 2) return showErr(form, 'You’re the only admin. Make someone else an admin first.');
    let note = 'Saved';
    if (FAMILY_MODE) {
      const pw = form.elements.password ? form.elements.password.value : '';
      const old = id ? S.members.find(m => m.id === id) : null;
      if (pw && !pwOK(pw)) return showErr(form, 'The password needs at least 10 characters, with a capital letter, a small letter and a number.');
      const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Saving…';
      try {
        if (!old) {
          if (!email) throw new Error('Add their email: it’s how they sign in.');
          const j = await memberLogin('create', { email, name, password: pw });
          note = j.existed ? `Saved. ${name} already had a sign-in, so their password is unchanged.` : `Saved. ${name} can sign in now with their email and the starting password.`;
        } else {
          const was = (old.email || '').toLowerCase();
          if (was && email && was !== email) { await memberLogin('change-email', { email: was, new_email: email }); note = 'Saved. They now sign in with ' + email + '.'; }
          else if (!was && email && !pw) throw new Error('Add a starting password too, so Somasu can set up their sign-in.');
          if (!was && email && pw) { const j = await memberLogin('create', { email, name, password: pw }); note = j.existed ? 'Saved. They already had a sign-in.' : 'Saved. They can sign in now.'; }
          else if (pw) { await memberLogin('set-password', { email: email || was, password: pw }); note = 'Saved. Their new starting password is set.'; }
        }
      } catch (e) { btn.disabled = false; btn.textContent = 'Save'; return showErr(form, e.message); }
    }
    if (id) await store.update('members', id, row); else await store.insert('members', row);
    closeModal(); toast(note);
  },
  async password(form) {
    const bad = $('#scrim')._check(); if (bad) return showErr(form, bad);
    const { error } = await client.auth.updateUser({ password: form.pw1.value });
    if (error) return showErr(form, /same|different/i.test(error.message) ? 'Choose a password you haven’t used for Somasu before.' : error.message);
    closeModal(); toast('Password changed');
  },
  async 'cal-link'(form) { await checkAndPreview(form); },
  async calendar(form, id) {
    const name = formVal(form, 'name'), url = formVal(form, 'url');
    if (!name || !url) return showErr(form, 'Add a name and the link.');
    if (!/^(https|webcal):\/\//i.test(url)) return showErr(form, 'The link should start with https:// or webcal://');
    const row = { name, url, colour: form.querySelector('[name=colour]:checked').value, visible: form.elements.visible.checked };
    let c;
    if (id) c = await store.update('calendars', id, row); else c = await store.insert('calendars', Object.assign(row, { created_by: S.me && S.me.id }));
    closeModal(); toast('Linking…');
    await loadAll(['calendars']);
    const cal = S.calendars.find(x => x.id === (c && c.id) || x.id === id);
    if (cal) { await fetchCalendar(cal, true); toast(S.extStatus[cal.id] === 'ok' ? `Linked: ${(S.external[cal.id] || []).length} events found` : 'Saved, but the calendar couldn’t be loaded. Check the link.'); }
    render();
  }
};
async function addItem(l, text, extra = {}) {
  const exists = S.items.find(i => i.list_id === l.id && !i.done && !i.cleared && i.text.toLowerCase() === text.toLowerCase());
  if (exists) { toast(`${text} is already on the list`); return false; }
  await store.insert('items', { list_id: l.id, text, category: l.kind === 'shopping' ? (extra.category || guessCat(text)) : null, note: extra.note || '', done: false, cleared: false, added_by: S.me && S.me.id });
  queueItemNotify(l, text);
  return true;
}

/* ------------------------------------------------------------------ barcode scanner (26 R9) */
// Scan a product's barcode with the phone camera to add it to a shopping list. The number is
// looked up in Open Food Facts (a free, open product database: name, brand, size, category; no
// prices). Only the barcode number leaves the phone: no picture is sent or kept. Phones that can
// read barcodes themselves (most Android phones) do; others (iPhone) use the ZXing reader, saved
// in public/vendor and only downloaded the first time someone scans.
const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const ZXING_SRC = 'vendor/zxing-0.21.3.min.js';
const priceUrl = text => 'https://www.trolley.co.uk/search/?q=' + encodeURIComponent(text);
// Open Food Facts categories to Somasu aisles, checked in order (most specific first).
const OFF_AISLES = [
  ['frozen', 'Frozen'],
  ['household', 'Household'], ['cleaning', 'Household'], ['detergent', 'Household'],
  ['cosmetic', 'Personal care'], ['hygiene', 'Personal care'], ['toothpaste', 'Personal care'], ['shampoo', 'Personal care'], ['baby-care', 'Personal care'],
  ['meats', 'Meat & fish'], ['poultr', 'Meat & fish'], ['seafood', 'Meat & fish'], ['fishes', 'Meat & fish'], ['sausages', 'Meat & fish'], ['hams', 'Meat & fish'],
  ['dairies', 'Dairy & eggs'], ['milks', 'Dairy & eggs'], ['cheeses', 'Dairy & eggs'], ['yogurts', 'Dairy & eggs'], ['butters', 'Dairy & eggs'], ['eggs', 'Dairy & eggs'], ['creams', 'Dairy & eggs'],
  ['breads', 'Bakery'], ['viennoiseries', 'Bakery'], ['cakes', 'Bakery'], ['pastries', 'Bakery'],
  ['drinks', 'Drinks'], ['beverages', 'Drinks'], ['waters', 'Drinks'], ['juices', 'Drinks'], ['sodas', 'Drinks'], ['wines', 'Drinks'], ['beers', 'Drinks'],
  ['canned', 'Cupboard'], ['cereals', 'Cupboard'], ['pastas', 'Cupboard'], ['rices', 'Cupboard'], ['sauces', 'Cupboard'], ['condiments', 'Cupboard'], ['spreads', 'Cupboard'], ['snacks', 'Cupboard'], ['crisps', 'Cupboard'], ['biscuits', 'Cupboard'], ['confectioner', 'Cupboard'], ['spices', 'Cupboard'], ['oils', 'Cupboard'], ['flours', 'Cupboard'], ['sugars', 'Cupboard'], ['teas', 'Cupboard'], ['coffees', 'Cupboard'],
  ['fresh-fruits', 'Fruit & veg'], ['fresh-vegetables', 'Fruit & veg'], ['fruits', 'Fruit & veg'], ['vegetables', 'Fruit & veg']
];
function offAisle(tags, name) {
  // Open Food Facts lists categories from general to specific, so read them from the end. Broad
  // groupings such as "plant-based-foods-and-beverages" say nothing about the aisle: skip them.
  const list = (tags || []).map(t => String(t).toLowerCase().replace(/^[a-z]{2}:/, '')).filter(t => !t.includes('-and-'));
  for (let i = list.length - 1; i >= 0; i--) for (const [k, aisle] of OFF_AISLES) if (list[i].includes(k)) return aisle;
  return guessCat(name || '');
}
/** A valid EAN-8, EAN-13, UPC-A or UPC-E style number: the right length and the check digit adds up. */
function validBarcode(code) {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const d = code.split('').map(Number), check = d.pop();
  const sum = d.reverse().reduce((a, n, i) => a + n * (i % 2 ? 1 : 3), 0);
  return (10 - sum % 10) % 10 === check;
}
/** Look a barcode up in Open Food Facts. Returns { found, name, note, category } (never throws). */
async function lookupBarcode(code) {
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(OFF_URL + code + '.json?fields=product_name,product_name_en,generic_name,brands,quantity,categories_tags', { signal: ctl.signal });
    clearTimeout(t);
    if (r.status === 404) return { found: false };
    if (!r.ok) return { found: false, error: true };
    const j = await r.json(), p = j.product || {};
    const name = String(p.product_name_en || p.product_name || p.generic_name || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    if (j.status !== 1 || !name) return { found: false };
    const brand = String(p.brands || '').split(',')[0].trim();
    const note = [brand && !name.toLowerCase().includes(brand.toLowerCase().split(' ')[0]) ? brand : '', String(p.quantity || '').trim()].filter(Boolean).join(' · ').slice(0, 160);
    return { found: true, name, note, category: offAisle(p.categories_tags, name) };
  } catch (e) { return { found: false, error: true }; }
}
const SCAN = { stream: null, timer: 0, run: 0 };
function scanStop() {
  SCAN.run++; clearTimeout(SCAN.timer);
  if (SCAN.stream) { SCAN.stream.getTracks().forEach(t => t.stop()); SCAN.stream = null; }
}
function loadScript(src) {
  return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('Couldn’t load the barcode reader')); document.head.appendChild(s); });
}
/** Returns a function that reads a barcode from the video (or null if none is in view). */
async function barcodeReader() {
  if ('BarcodeDetector' in window) {
    try {
      const have = await window.BarcodeDetector.getSupportedFormats();
      const want = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(f => have.includes(f));
      if (want.length) { const d = new window.BarcodeDetector({ formats: want }); return async v => { const r = await d.detect(v); return r.length ? r[0].rawValue : null; }; }
    } catch (e) { /* fall back to ZXing */ }
  }
  if (!window.ZXing) await loadScript(ZXING_SRC);
  const Z = window.ZXing, hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const reader = new Z.MultiFormatReader(); reader.setHints(hints);
  const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
  return async v => {
    const w = v.videoWidth, h = v.videoHeight; if (!w || !h) return null;
    const k = Math.min(1, 960 / Math.max(w, h)); c.width = Math.round(w * k); c.height = Math.round(h * k);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    try { return reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(c)))).getText(); }
    catch (e) { return null; } finally { reader.reset(); }
  };
}
function scanForm(listId) {
  const s = modal('Scan a barcode', `<div class="scanbox"><video id="scanV" playsinline muted autoplay aria-label="Camera view"></video><div class="scanaim" aria-hidden="true"></div></div>
    <p class="small muted" id="scanMsg" role="status">Starting the camera…</p>
    <form data-form="scan-code" data-id="${listId}" autocomplete="off"><div class="f"><label for="scanCode">Or type the number under the barcode</label>
      <div class="scanrow"><input id="scanCode" name="code" type="text" inputmode="numeric" maxlength="14" placeholder="e.g. 5000157024671"><button class="btn" type="submit">Look up</button></div></div></form>
    <p class="small muted">Only the barcode number is looked up, in Open Food Facts. No picture leaves your phone.</p>`);
  scanStart(s, listId);
}
async function scanStart(s, listId) {
  const run = ++SCAN.run, msg = t => { const m = s.querySelector('#scanMsg'); if (m) m.textContent = t; };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { s.querySelector('.scanbox').hidden = true; return msg('This browser can’t use the camera here. Type the number instead.'); }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    if (run !== SCAN.run) { stream.getTracks().forEach(t => t.stop()); return; }
    SCAN.stream = stream;
    const v = s.querySelector('#scanV'); v.srcObject = stream; await v.play().catch(() => {});
    msg('Point the camera at the barcode and hold it steady.');
    const read = await barcodeReader();
    let last = '', seen = 0;
    const tick = async () => {
      if (run !== SCAN.run) return;
      let code = null; try { code = await read(v); } catch (e) { /* keep trying */ }
      if (run !== SCAN.run) return;
      // Only accept a number with a correct check digit, seen twice in a row, so a blurred read can't slip through.
      if (code && validBarcode(code)) { seen = code === last ? seen + 1 : 1; last = code; if (seen >= 2) {
        // Hold the picture for a moment with a green frame, so it's clear the barcode was read.
        v.pause(); const aim = s.querySelector('.scanaim'); if (aim) aim.classList.add('hit'); msg('Got it: ' + code);
        if (navigator.vibrate) navigator.vibrate(60);
        SCAN.timer = setTimeout(() => { if (run === SCAN.run) { scanStop(); scanFound(code, listId); } }, 600);
        return;
      } }
      SCAN.timer = setTimeout(tick, 200);
    };
    tick();
  } catch (e) {
    if (run !== SCAN.run) return;
    s.querySelector('.scanbox').hidden = true;
    msg(e && e.name === 'NotAllowedError' ? 'Camera access is off for Somasu. Allow the camera in your browser or phone settings, or type the number instead.'
      : e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') ? 'No camera was found. Type the number instead.'
      : 'The camera couldn’t start. Type the number instead.');
  }
}
async function scanFound(code, listId) {
  const s = modal('Scanned', `<p class="small muted" role="status">Looking up ${esc(code)}…</p>`);
  const p = await lookupBarcode(code);
  if (!document.body.contains(s)) return; // closed while looking up
  const lists = S.lists.filter(x => x.kind === 'shopping');
  const name = p.found ? p.name : '', cat = p.found ? p.category : 'Other';
  modal(p.found ? 'Add to list' : 'Not found', `<form data-form="scan-add" data-id="${listId}" autocomplete="off">
    ${p.found ? '' : `<p class="small">${p.error ? 'The product database couldn’t be reached just now.' : 'This product isn’t in Open Food Facts yet.'} Type its name and it’ll still be added.</p>`}
    <div class="f"><label for="scT">Item</label><input id="scT" type="text" name="text" required maxlength="120" value="${esc(name)}" placeholder="e.g. baked beans"></div>
    <div class="f"><label>Aisle</label><select name="category">${CAT_ORDER.map(c => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <div class="f"><label for="scN">Note <span class="muted" style="font-weight:500">(brand, size, how many)</span></label><input id="scN" type="text" name="note" maxlength="160" value="${esc(p.found ? p.note : '')}"></div>
    ${lists.length > 1 ? `<div class="f"><label>List</label><select name="list_id">${lists.map(x => `<option value="${x.id}" ${x.id === listId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` : ''}
    <div class="actions"><button type="button" class="btn ghost" data-act="scan" data-id="${listId}">${I.scan} Scan again</button>${p.found ? `<a class="btn ghost" href="${esc(priceUrl(name))}" target="_blank" rel="noopener noreferrer">Compare prices</a>` : ''}<button class="btn dark grow" type="submit">Add to list</button></div>
    <p class="small muted">Barcode ${esc(code)}${p.found ? ' · details from Open Food Facts' : ''}</p></form>`);
}

/* ------------------------------------------------------------------ notifications */
// Each device turns notifications on for itself. Family mode: the device is saved in the
// push_subscriptions table and the Netlify functions send to it. Try-out mode: only a
// local test notification, so you can see what they look like.
const PUSH_OK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const PUSH_KINDS = [['lists', 'Lists', 'When someone adds to a shopping or to-do list'], ['events', 'Calendar', 'When an event for you (or everyone) is added, changed or cancelled'], ['bookings', 'Bookings', 'When something is booked, changed or cancelled'], ['reminders', 'Reminders', 'Before events, when a reminder is set'], ['bins', 'Bin day', 'At 7pm the evening before, saying which bin goes out']];
const PUSH_DEFAULT = { lists: true, events: true, bookings: true, reminders: true, bins: true };
S.push = { on: false, row: null, prefs: Object.assign({}, PUSH_DEFAULT, store_get('somasu-push-prefs', {})) };

function b64ToU8(str) { const p = '='.repeat((4 - str.length % 4) % 4); const raw = atob((str + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); }
function deviceName() { const u = navigator.userAgent; return /iphone/i.test(u) ? 'iPhone' : /ipad/i.test(u) || IS_IOS ? 'iPad' : /android/i.test(u) ? 'Android' : /windows/i.test(u) ? 'Windows' : /mac/i.test(u) ? 'Mac' : /linux/i.test(u) ? 'Linux' : 'Device'; }
async function pushRefresh() {
  if (!PUSH_OK) return;
  if (!FAMILY_MODE) { S.push.on = store_get('somasu-push-local', false) && Notification.permission === 'granted'; return; }
  const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) { S.push.on = false; S.push.row = null; return; }
  const { data } = await client.from('push_subscriptions').select('*').eq('endpoint', sub.endpoint).maybeSingle();
  S.push.on = !!data; S.push.row = data || null;
  if (data && data.prefs) S.push.prefs = Object.assign({}, PUSH_DEFAULT, data.prefs);
}
async function enablePush() {
  if (!PUSH_OK) return toast(IS_IOS && !STANDALONE ? 'Add Somasu to your Home Screen first, then turn notifications on there.' : 'This browser can’t show notifications.');
  if (FAMILY_MODE && !CFG.vapidPublicKey) return toast('Notifications aren’t set up yet. An admin needs to add the keys (Admin guide).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return modal('Notifications are blocked', `<p>This ${esc(deviceName())} has been told not to show notifications from Somasu.</p><p class="small">To fix it, open your ${IS_IOS ? 'iPhone Settings › Notifications › Somasu' : 'browser’s site settings for this page (the icon left of the address)'} and allow notifications, then come back and try again.</p>`);
  }
  if (!FAMILY_MODE) { store_set('somasu-push-local', true); S.push.on = true; render(); return testNotification(); }
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(CFG.vapidPublicKey) });
  const j = sub.toJSON();
  await client.from('push_subscriptions').delete().eq('endpoint', j.endpoint); // clears an old copy of this device, if it was yours
  const { data, error } = await client.from('push_subscriptions').insert({ member_id: S.me.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, device: deviceName(), prefs: S.push.prefs }).select().single();
  if (error) throw error;
  S.push.on = true; S.push.row = data; render();
  toast('Notifications on for this ' + deviceName());
}
async function disablePush(quiet) {
  if (FAMILY_MODE) {
    const reg = PUSH_OK && await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  } else store_set('somasu-push-local', false);
  S.push.on = false; S.push.row = null; if (!quiet) render();
}
async function setPushPref(k, v) {
  S.push.prefs = Object.assign({}, S.push.prefs, { [k]: v }); store_set('somasu-push-prefs', S.push.prefs);
  if (FAMILY_MODE && S.push.row) { const { error } = await client.from('push_subscriptions').update({ prefs: S.push.prefs }).eq('id', S.push.row.id); if (error) throw error; }
  toast('Saved');
}
async function authHeader() { if (!client) return {}; const { data } = await client.auth.getSession(); return data.session ? { Authorization: 'Bearer ' + data.session.access_token } : {}; }
async function testNotification() {
  if (FAMILY_MODE) {
    let r, j = {};
    try { r = await fetch('/api/notify', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, await authHeader()), body: JSON.stringify({ kind: 'test' }) }); j = await r.clone().json().catch(() => ({})); }
    catch (e) { return toast('Couldn’t reach Somasu. Check your internet connection and try again.'); }
    if (!r.ok) return modal('The test couldn’t be sent', `<p>${esc(j.error || (r.status === 401 ? 'Somasu didn’t recognise your sign-in. Sign out and back in, then try again.' : r.status === 503 ? 'Notifications aren’t set up on the server yet (Admin guide).' : 'The server answered with error ' + r.status + '.'))}</p>`);
    if (j.sent > 0) return toast(`Test sent to ${j.sent === 1 ? 'your device' : j.sent + ' of your devices'}. It should arrive in a few seconds.`);
    if (!j.devices || j.gone) return modal('No device to send to', '<p>Somasu has no working notification sign-up for you yet. Tap <b>Turn off</b>, then <b>Turn on</b> again on this device, then send another test.</p>');
    return modal('The test couldn’t be delivered', `<p>The notification service refused it${(j.codes || []).length ? ' (code ' + esc(j.codes.join(', ')) + ')' : ''}. This usually means the notification keys in Netlify don’t match the one in the app. An admin can check this (Admin guide, Troubleshooting).</p>`);
  }
  const opts = { body: 'This is what Somasu notifications look like.', icon: 'icon-192.png', badge: 'badge-96.png', tag: 'somasu-test' };
  const reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration();
  if (reg) reg.showNotification('Somasu', opts); else new Notification('Somasu', opts);
}
// Tell the rest of the family. Only in family mode; never blocks or fails the save.
function sendNotify(payload) {
  if (!FAMILY_MODE) return;
  authHeader().then(h => fetch('/api/notify', { method: 'POST', keepalive: true, headers: Object.assign({ 'content-type': 'application/json' }, h), body: JSON.stringify(payload) })).catch(() => {});
}
// List additions are gathered up so adding ten things sends one notification, not ten.
const itemQueue = {}; let itemTimer = null;
function queueItemNotify(list, text) {
  if (!FAMILY_MODE) return;
  (itemQueue[list.id] = itemQueue[list.id] || { name: list.name, texts: [] }).texts.push(text);
  clearTimeout(itemTimer); itemTimer = setTimeout(flushItems, 45000);
}
function flushItems() {
  clearTimeout(itemTimer);
  Object.keys(itemQueue).forEach(id => { const q = itemQueue[id]; delete itemQueue[id]; sendNotify({ kind: 'items', title: q.name, texts: q.texts.slice(0, 20), count: q.texts.length, url: '#lists/' + id }); });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushItems(); });
function notifyEventGone(ev) { sendNotify({ kind: 'event', action: 'cancelled', title: ev.title, when: whenText(new Date(ev.start_at), new Date(ev.end_at), ev.all_day, ev.repeat), who: ev.who || [], url: '#calendar' }); }
function whenText(s, e, allDay, repeat) {
  const rep = { daily: ', every day', weekly: ', every week', fortnightly: ', every 2 weeks', monthly: ', every month', yearly: ', every year' }[repeat] || '';
  if (allDay) return fmtDayShort(s) + (sameDay(s, addDays(e, -1)) || +e - +s <= 86400000 ? '' : ' to ' + fmtDayShort(addDays(e, -1))) + rep;
  return fmtDayShort(s) + ' ' + fmtTime(s) + (sameDay(s, e) ? '–' + fmtTime(e) : ' to ' + fmtDayShort(e) + ' ' + fmtTime(e)) + rep;
}
function notifySection() {
  const blocked = PUSH_OK && Notification.permission === 'denied';
  let top;
  if (!PUSH_OK && IS_IOS && !STANDALONE) top = `<p class="small" style="margin-top:0">On iPhone and iPad, notifications only work in the installed app. Add Somasu to your Home Screen (see <b>Install</b> below), open it from there, then come back here.</p>`;
  else if (!PUSH_OK) top = `<p class="small" style="margin-top:0">This browser can’t show notifications. Try Chrome, Edge, Firefox or Safari, or install the app.</p>`;
  else if (S.push.on) top = `<div class="row" style="border:0;padding-top:0"><span style="font-size:20px">🔔</span><div class="main"><div class="t">On for this ${esc(deviceName())}</div><div class="m">Choose what you hear about:</div></div><button class="btn sm ghost" data-act="push-off">Turn off</button></div>
      ${PUSH_KINDS.map(([k, label, hint]) => `<label class="toggle" style="padding:8px 0;border-top:1px solid var(--line)"><input type="checkbox" data-act="push-pref" data-k="${k}" ${S.push.prefs[k] !== false ? 'checked' : ''}><span>${label}<br><span class="small muted" style="font-weight:500">${hint}</span></span></label>`).join('')}
      <div class="actions"><button class="btn sm ghost" data-act="push-test">Send me a test</button></div>`;
  else top = `<p class="small" style="margin-top:0">Get a nudge when someone adds to a list, books something or changes an event for you, plus reminders before events. You won’t hear about your own changes.${blocked ? ' <b>Notifications are blocked for this site at the moment.</b>' : ''}</p>
      <div class="actions"><button class="btn sm" data-act="push-on">🔔 Turn on for this ${esc(deviceName())}</button></div>`;
  return `<div class="card">${top}${!FAMILY_MODE ? '<p class="small muted">Try-out mode: you’ll only see a test. Real notifications start once the family database is connected.</p>' : ''}</div>`;
}

/* ------------------------------------------------------------------ version, What's new, Help */
/* ---- Report a problem (Andy, 05-11-2026): an email to the family admin with the details filled in.
   Somasu is a family app Andy manages, so there's no separate "contact the developer". The address is
   somiahdev@proton.me unless an admin changes it on the Family page (Problem reports), which saves it in
   the family database (app_settings, support_email). config.js supportEmail is a fallback, not needed. */
const DEFAULT_SUPPORT_EMAIL = 'somiahdev@proton.me';
const supportEmail = () => ((S.settings || {}).support_email || CFG.supportEmail || DEFAULT_SUPPORT_EMAIL).trim();
const reportTo = () => [supportEmail()];
const reportToText = () => 'the family admin';
function browserName() { const u = navigator.userAgent; return /vivaldi/i.test(u) ? 'Vivaldi' : /edg\//i.test(u) ? 'Edge' : /samsungbrowser/i.test(u) ? 'Samsung Internet' : /firefox|fxios/i.test(u) ? 'Firefox' : /chrome|crios/i.test(u) ? 'Chrome' : /safari/i.test(u) ? 'Safari' : 'browser'; }
function reportProblem() {
  const to = reportTo();
  if (!to.length) return toast('No family admin has an email address yet. An admin can add one on the Family page.');
  const page = (TABS.find(t => t[0] === S.tab) || ['', 'Home'])[1];
  const lines = ['What happened?', '', '', 'What were you trying to do?', '', '', '---',
    'Please don’t include passwords.',
    'Page: ' + page,
    'Version: ' + VERSION + ' (' + APP_UPDATED + ')' + (FAMILY_MODE ? '' : ', try-out mode'),
    'From: ' + (S.me ? S.me.name + (S.me.email ? ' (' + S.me.email + ')' : '') : 'not signed in'),
    'Device: ' + deviceName() + ', ' + browserName() + (STANDALONE ? ' (installed app)' : ''),
    'When: ' + new Date().toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    'Address: ' + location.href];
  const href = 'mailto:' + to.map(encodeURIComponent).join(',') + '?subject=' + encodeURIComponent('Somasu problem (' + VERSION + ', ' + page + ')') + '&body=' + encodeURIComponent(lines.join('\r\n'));
  modal('Report a problem', `<p>This opens your email app with a message to ${esc(reportToText())} (${esc(to[0])}), with the page, version and device already filled in. Just say what happened.</p>
    <div class="actions"><a class="btn grow" id="repGo" href="${esc(href)}">Write the email</a></div>
    <p class="small muted">No email app? Send the details to ${esc(to[0])}.</p>`, s => { s.querySelector('#repGo').onclick = () => setTimeout(closeModal, 300); });
}
function verHtml() {
  return `Version <a href="#" data-act="whatsnew" data-v="${VERSION}"><b>${VERSION}</b></a>${PRE_RELEASE ? ' (pre-release)' : ''} · ${APP_UPDATED} · <a href="#" data-act="whatsnew"><b>What’s new</b></a>`;
}
if (!RELEASES.length || RELEASES[0].v !== VERSION) console.warn('Release notes missing for ' + VERSION);
function showWhatsNew(v) {
  const admin = isAdmin();
  const body = `<div class="wn-intro"><p class="small muted" style="margin:0 0 8px">Every release, newest first.</p>
    <div class="chips">${RELEASES.map(r => `<button class="chip ${r.v === VERSION ? 'on' : ''}" data-act="wn-jump" data-v="${r.v}">${esc(r.v.split(' ')[1])}</button>`).join('')}</div></div>
    ${RELEASES.map(r => {
      const mine = r.everyone || [], adm = admin ? (r.admin || []) : [];
      const test = /R0\./.test(r.v);
      return `<section class="wn" id="wn-${r.v.replace(/\W/g, '')}"><h3>${esc(r.v)} <span class="small muted" style="font-weight:500">· ${esc(r.date)}</span>${r.v === VERSION ? ' <span class="tag gold">This version</span>' : ''}${test ? ' <span class="tag">Test build</span>' : ''}</h3>
        ${mine.length ? `<ul>${mine.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="small muted">No changes you’ll notice. This release was for admins.</p>`}
        ${adm.length ? `<p class="lab">For admins</p><ul>${adm.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</section>`;
    }).join('')}`;
  modal('What’s new', body, s => { if (v) { const t = s.querySelector('#wn-' + v.replace(/\W/g, '')); t && setTimeout(() => t.scrollIntoView({ block: 'start' }), 30); } });
}
const HELP_TOPIC = { home: 'home', lists: 'lists', calendar: 'calendar', bookings: 'bookings', more: 'family' };
function guideLink(g, p, label) { return `<a href="${g.file}#page=${p}" target="_blank" rel="noopener">${esc(label)}</a>`; }
function showHelp() {
  const topic = HELP_TOPIC[S.tab] || 'home';
  const g = GUIDES.user, a = GUIDES.admin;
  const here = g.contents.find(c => c.topic === topic) || g.contents[0];
  const list = (gd) => `<ol class="toc">${gd.contents.map(c => `<li>${guideLink(gd, c.p, c.t)}<span>${c.p}</span></li>`).join('')}</ol>`;
  const vids = VIDEOS.filter(v => v.topic === topic);
  const vcard = v => `<button class="vid" data-act="video" data-id="${v.id}"><img src="${v.file.replace('.mp4', '.jpg')}" alt="" loading="lazy"><span>▶ ${esc(v.title)}</span></button>`;
  modal('Help', `${here ? `<div class="banner" style="margin-bottom:12px"><span>📖</span><span><b>Help with this page:</b> ${guideLink(g, here.p, here.t + ' (page ' + here.p + ')')}${vids.length ? `<br><a href="#" data-act="video" data-id="${vids[0].id}">▶ Watch how</a>` : ''}</span></div>` : ''}
    <h3 class="help-h">Short videos</h3><div class="vids">${VIDEOS.map(vcard).join('')}</div>
    <h3 class="help-h">${esc(g.title)}</h3>
    <div class="actions" style="margin-top:6px"><a class="btn sm" href="${g.file}" target="_blank" rel="noopener">Open</a><a class="btn sm ghost" href="${g.file}" download>${I.dl} Download</a></div>
    ${list(g)}
    ${isAdmin() ? `<h3 class="help-h">${esc(a.title)} <span class="tag">Admins</span></h3><div class="actions" style="margin-top:6px"><a class="btn sm" href="${a.file}" target="_blank" rel="noopener">Open</a><a class="btn sm ghost" href="${a.file}" download>${I.dl} Download</a></div>${list(a)}` : ''}
    <h3 class="help-h">Something not working?</h3><p class="small">Tell ${esc(reportToText())}. Somasu fills in the details for you.</p><div class="actions" style="margin-top:6px"><button class="btn sm" data-act="report">Report a problem</button></div>
    <p class="small muted ver" style="text-align:center;margin-top:18px">${verHtml()}</p>`);
}

/* ------------------------------------------------------------------ links into the app */
// #lists/<id>, #calendar/<yyyy-mm-dd>, #bookings/<id>/<yyyy-mm-dd>, #whatsnew, #help
// Notifications open these, so a tap lands on the right list, day or booking.
function applyRoute() {
  const qs = new URLSearchParams(location.search);
  const h = location.hash.replace(/^#\/?/, '');
  if (!h && !qs.has('whatsnew')) return;
  const [tab, a, b] = h.split('/');
  history.replaceState(null, '', location.pathname);
  if (qs.has('whatsnew') || tab === 'whatsnew') { render(); return setTimeout(() => showWhatsNew(qs.get('whatsnew') || a), 50); }
  if (tab === 'help') { render(); return setTimeout(showHelp, 50); }
  if (!HELP_TOPIC[tab]) return;
  S.tab = tab; store_set('somasu-tab', tab);
  if (tab === 'lists' && a) { S.listId = a; store_set('somasu-list', a); }
  if (tab === 'calendar' && a && /^\d{4}-\d{2}-\d{2}$/.test(a)) { S.calDay = parseYmd(a); S.calMonth = new Date(S.calDay.getFullYear(), S.calDay.getMonth(), 1); S.calView = 'month'; }
  if (tab === 'bookings') { if (a) S.facilityId = a; if (b && /^\d{4}-\d{2}-\d{2}$/.test(b)) S.bookDay = parseYmd(b); }
  render();
}
window.addEventListener('hashchange', applyRoute);
navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'open' && e.data.url) { location.hash = e.data.url.replace(/^.*#/, '#'); } });

/* ------------------------------------------------------------------ actions */
function eventICS(ev) {
  const z = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dOnly = d => ymd(d).replace(/-/g, '');
  const s = new Date(ev.start_at), e = new Date(ev.end_at);
  const rr = { daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY', fortnightly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' }[ev.repeat];
  const t = x => String(x || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Somiah//Somasu//EN', 'BEGIN:VEVENT', 'UID:' + ev.id + '@somasu', 'DTSTAMP:' + z(new Date()),
    ev.all_day ? 'DTSTART;VALUE=DATE:' + dOnly(s) : 'DTSTART:' + z(s), ev.all_day ? 'DTEND;VALUE=DATE:' + dOnly(e) : 'DTEND:' + z(e),
    rr ? 'RRULE:' + rr + (ev.repeat_until ? ';UNTIL=' + ev.repeat_until.replace(/-/g, '') + 'T235959Z' : '') : null,
    'SUMMARY:' + t(ev.title), ev.location ? 'LOCATION:' + t(ev.location) : null, ev.notes ? 'DESCRIPTION:' + t(ev.notes) : null,
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}
const ACT = {
  close: closeModal,
  tab(el) { S.tab = el.dataset.tab; store_set('somasu-tab', S.tab); closeModal(); render(); window.scrollTo(0, 0); },
  'open-list'(el) { S.listId = el.dataset.id; store_set('somasu-list', S.listId); S.tab = 'lists'; store_set('somasu-tab', 'lists'); render(); },
  'new-list'() { listForm(null); },
  scan(el) { scanForm(el.dataset.id || (currentList() || {}).id); },
  'list-menu'(el) { listForm(S.lists.find(l => l.id === el.dataset.id)); },
  'delete-list'(el) {
    const l = S.lists.find(x => x.id === el.dataset.id);
    confirmBox('Delete this list?', `“${l.name}” and everything on it will be removed for the whole family.`, 'Delete list', async () => { await store.remove('lists', l.id); S.listId = null; toast('List deleted'); });
  },
  'add-item-focus'() { if (!currentList()) return listForm(null); const i = $('#newItem'); i && (i.focus(), i.scrollIntoView({ block: 'center' })); },
  async again(el) { const l = currentList(); l && await addItem(l, el.dataset.text); },
  async tick(el) {
    const i = S.items.find(x => x.id === el.dataset.id); if (!i) return;
    const done = !i.done;
    Object.assign(i, { done, done_by: done ? S.me && S.me.id : null, done_at: done ? new Date().toISOString() : null }); render(); // feels instant
    await store.update('items', i.id, { done, done_by: i.done_by, done_at: i.done_at });
  },
  'edit-item'(el) { const i = S.items.find(x => x.id === el.dataset.id); i && itemForm(i); },
  'delete-item'(el) { closeModal(); store.remove('items', el.dataset.id).then(() => toast('Removed')).catch(fail); },
  'toggle-done'() { S.showDone = !S.showDone; render(); },
  async 'clear-done'() {
    const l = currentList(); const done = S.items.filter(i => i.list_id === l.id && i.done && !i.cleared);
    // Cleared items are hidden, not deleted, so they keep feeding the "add again" suggestions.
    await Promise.all(done.map(i => store.update('items', i.id, { cleared: true }))); toast(`Cleared ${done.length}`);
  },
  'quick-add'() {
    modal('Add', `<div class="actions" style="flex-direction:column;margin-top:0">
      <button class="btn" data-act="qa" data-to="lists">${I.cart} Something to buy</button>
      <button class="btn" data-act="qa" data-to="calendar">${I.cal} Something on the calendar</button>
      <button class="btn" data-act="qa" data-to="bookings">${I.key} Book something</button></div>`);
  },
  qa(el) {
    closeModal(); S.tab = el.dataset.to; store_set('somasu-tab', S.tab); draw();
    if (S.tab === 'lists') ACT['add-item-focus'](); else if (S.tab === 'calendar') eventForm(null); else if (S.facilities.length) bookingForm(null); else facilityForm(null);
  },
  'new-event'(el) { eventForm(null, el && el.dataset.d ? parseYmd(el.dataset.d) : null); },
  'edit-event'(el) { const ev = S.events.find(x => x.id === el.dataset.id); ev && eventForm(ev, null, el.dataset.start); },
  'view-linked'(el) {
    const cal = S.calendars.find(c => c.id === el.dataset.cal); const st = +el.dataset.start;
    const x = (S.external[cal.id] || []).find(x => occurrences(x, new Date(st - 1), new Date(st + 1)).some(o => +o.start === st)) || {};
    const s = new Date(st), e = new Date(st + (x.end - x.start || 0));
    const m = eventsBetween(new Date(st - 1), new Date(st + 1)).find(o => o.kind === 'linked' && +o.start === st && o.cals.includes(cal));
    const cals = m ? m.cals : [cal];
    const tag = c => `<span class="src" style="display:inline-block;background:var(--indigo-tint);padding:3px 8px;border-radius:6px;font-size:12px;font-weight:700;margin:0 4px 4px 0">${esc(cals.length > 1 ? calLabel(c) : c.name)}</span>`;
    modal(x.title || 'Event', `<p>${cals.length > 1 ? '<span class="small muted">In ' + cals.length + ' calendars:</span><br>' : ''}${cals.map(tag).join('')}</p>
      <p><b>${relDay(s)}</b><br>${x.allDay ? 'All day' : fmtTime(s) + ' to ' + fmtTime(e)}</p>${x.location ? `<p>📍 ${esc(x.location)}</p>` : ''}${x.notes ? `<p class="small muted" style="white-space:pre-wrap">${esc(x.notes)}</p>` : ''}
      <p class="small muted">From a linked calendar, so it's read-only here. Change it in ${esc(cals.length > 1 ? 'the calendars it came from' : cal.name)}.</p>`);
  },
  'allday-toggle'(el) { el.form.querySelectorAll('.tm').forEach(x => x.classList.toggle('hidden', el.checked)); },
  'delete-event'(el) {
    const ev = S.events.find(x => x.id === el.dataset.id); const occ = +el.dataset.occ;
    if (ev.repeat && ev.repeat !== 'none' && occ) {
      modal('Delete repeating event', `<p>“${esc(ev.title)}” repeats. What should go?</p><div class="actions" style="flex-direction:column">
        <button class="btn ghost" id="d1">Just ${esc(relDay(new Date(occ)).toLowerCase() === 'today' ? 'today' : fmtDayShort(new Date(occ)))}</button>
        <button class="btn danger" id="d2">Every time</button></div>`, s => {
        s.querySelector('#d1').onclick = async () => { closeModal(); try { await store.update('events', ev.id, { skip_dates: [...(ev.skip_dates || []), ymd(new Date(occ))] }); toast('Removed that day'); } catch (e) { fail(e); } };
        s.querySelector('#d2').onclick = async () => { closeModal(); try { await store.remove('events', ev.id); notifyEventGone(ev); toast('Event deleted'); } catch (e) { fail(e); } };
      });
    } else confirmBox('Delete event?', `“${ev.title}” will be removed from the family calendar.`, 'Delete', async () => { await store.remove('events', ev.id); notifyEventGone(ev); toast('Event deleted'); });
  },
  'ics-event'(el) { const ev = S.events.find(x => x.id === el.dataset.id); download(ev.title.replace(/[^\w -]/g, '').trim() + '.ics', eventICS(ev), 'text/calendar'); },
  'cal-prev'() { S.calMonth = new Date(S.calMonth.getFullYear(), S.calMonth.getMonth() - 1, 1); render(); },
  'cal-next'() { S.calMonth = new Date(S.calMonth.getFullYear(), S.calMonth.getMonth() + 1, 1); render(); },
  'cal-today'() { S.calMonth = sod(new Date()); S.calDay = sod(new Date()); render(); },
  'cal-view'(el) { S.calView = el.dataset.v; store_set('somasu-calview', S.calView); render(); },
  'cal-day'(el) {
    const d = parseYmd(el.dataset.d);
    if (sameDay(d, S.calDay) && !window.matchMedia('(min-width:1000px)').matches) return eventForm(null, d); // second tap adds
    S.calDay = d; if (d.getMonth() !== S.calMonth.getMonth()) S.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); render();
  },
  filter(el) { const k = el.dataset.key; S.hidden.has(k) ? S.hidden.delete(k) : S.hidden.add(k); store_set('somasu-hidden', [...S.hidden]); render(); },
  'pick-facility'(el) { S.facilityId = el.dataset.id; render(); },
  'book-prev'() { S.bookDay = addDays(S.bookDay, -1); render(); },
  'book-next'() { S.bookDay = addDays(S.bookDay, 1); render(); },
  'new-booking'() { if (!S.facilities.length) return facilityForm(null); bookingForm(null); },
  'edit-booking'(el) { const b = S.bookings.find(x => x.id === el.dataset.id); b && bookingForm(b); },
  'delete-booking'(el) {
    const b = S.bookings.find(x => x.id === el.dataset.id);
    confirmBox('Cancel this booking?', 'It will be freed up for everyone else.', 'Cancel booking', async () => {
      await store.remove('bookings', b.id); toast('Booking cancelled');
      sendNotify({ kind: 'booking', action: 'cancelled', title: (S.facilities.find(x => x.id === b.facility_id) || {}).name || 'Booking', when: whenText(new Date(b.start_at), new Date(b.end_at), false), for_name: mName(b.member_id), url: '#bookings/' + b.facility_id });
    });
  },
  'new-facility'() { facilityForm(null); },
  'edit-facility'(el) { facilityForm(S.facilities.find(f => f.id === el.dataset.id)); },
  'delete-facility'(el) { const f = S.facilities.find(x => x.id === el.dataset.id); confirmBox(`Delete ${f.name}?`, 'Its bookings will be deleted too.', 'Delete', async () => { await store.remove('facilities', f.id); S.facilityId = null; toast('Deleted'); }); },
  'new-member'() { memberForm(null); },
  'gen-pw'() { const pw = $('#mP'); if (!pw) return; pw.value = makePassword(); pw.type = 'text'; const b = pw.parentNode.querySelector('.pwshow'); if (b) setPwShown(b, true); pw.dispatchEvent(new Event('input')); },
  'edit-member'(el) { memberForm(S.members.find(m => m.id === el.dataset.id)); },
  'delete-member'(el) {
    const m = S.members.find(x => x.id === el.dataset.id);
    if (S.me && m.id === S.me.id) return toast('You can’t remove yourself.');
    confirmBox(`Remove ${m.name}?`, FAMILY_MODE ? 'Their sign-in is removed too, so they won’t be able to open Somasu any more. Their past items and events stay.' : 'They’ll be removed from this device.', 'Remove', async () => {
      if (FAMILY_MODE && m.email) { try { await memberLogin('remove', { email: m.email }); } catch (e) { return toast(e.message); } }
      await store.remove('members', m.id); toast('Removed');
    });
  },
  'switch-me'() {
    modal('Who’s using this device?', `<div class="actions" style="flex-direction:column;margin-top:0">${S.members.map(m => `<button class="btn ghost" data-act="set-me" data-id="${m.id}" style="justify-content:flex-start">${avatar(m.id)} ${esc(m.name)}</button>`).join('')}</div>`);
  },
  'set-me'(el) { store_set('somasu-me', el.dataset.id); S.me = memberById(el.dataset.id); closeModal(); render(); },
  'new-calendar'() { linkCalendarWizard(null); },
  'cal-provider'(el) { linkCalendarWizard(el.dataset.p); },
  async 'cal-paste'(el) {
    try { const t = await navigator.clipboard.readText(); const f = el.closest('form'); f.elements.url.value = t.trim(); f.requestSubmit(); }
    catch (e) { toast('Press and hold in the box, then choose Paste'); }
  },
  async 'cal-save'(el) {
    const box = el.closest('#calcheck'), name = (box.querySelector('#cn2').value || 'Calendar').trim().slice(0, 40);
    el.disabled = true;
    const c = await store.insert('calendars', { name, url: el.dataset.url, colour: nextCalColour(), visible: true, created_by: S.me && S.me.id });
    if (box._text && c) { store_set('somasu-ics-' + c.id, { at: Date.now(), text: box._text }); S.external[c.id] = parseICS(box._text); S.extStatus[c.id] = 'ok'; }
    await loadAll(['calendars']); render();
    modal('Linked', `<div class="found" style="margin-top:0">✓ <b>${esc(name)}</b> is now on the family calendar.</div>
      <div class="actions" style="flex-direction:column"><button class="btn" data-act="new-calendar">${I.plus} Link another calendar</button><button class="btn ghost" data-act="close">Done</button></div>`);
  },
  'edit-calendar'(el) { calendarForm(S.calendars.find(c => c.id === el.dataset.id)); },
  'delete-calendar'(el) { confirmBox('Unlink this calendar?', 'Its events will disappear from Somasu. Nothing changes in the original calendar.', 'Unlink', async () => { await store.remove('calendars', el.dataset.id); toast('Unlinked'); }); },
  'refresh-cals'() { toast('Refreshing…'); refreshCalendars(true); },
  'sign-out-ask'() { confirmBox('Sign out of Somasu?', 'You’ll need your email and password to sign back in on this device.', 'Sign out', () => ACT['sign-out']()); },
  async 'sign-out'() { try { await disablePush(true); } catch (e) { /* carry on signing out */ } await client.auth.signOut(); location.reload(); },
  'change-password'() { changePasswordForm(); },
  async 'push-on'() { await enablePush(); },
  async 'push-off'() { await disablePush(); toast('Notifications off for this device'); },
  async 'push-pref'(el) { await setPushPref(el.dataset.k, el.checked); },
  async 'push-test'() { await testNotification(); },
  help() { showHelp(); },
  report() { reportProblem(); },
  bins() { binSheet(); },
  'edit-bins'() { if (isAdmin()) binsForm(); },
  async 'clear-bins'() {
    if (!confirm('Turn off bin day? Somasu stops showing bins and sending bin reminders. You can set it up again any time.')) return;
    try { await saveSetting('bins', ''); closeModal(); render(); toast('Bin day turned off'); } catch (e) { toast(e.message); }
  },
  'edit-support'() {
    modal('Problem reports', `<form data-form="support" autocomplete="off">
      <div class="f"><label for="supE">Send Report a problem emails to</label><input id="supE" type="email" name="email" required value="${esc(supportEmail())}" inputmode="email"></div>
      <p class="small muted">Everyone in the family uses this address. Starts as ${esc(DEFAULT_SUPPORT_EMAIL)}.</p>
      <div class="actions"><button type="button" class="btn ghost" data-act="close">Cancel</button><button type="submit" class="btn dark grow">Save</button></div></form>`);
  },
  video(el) {
    const v = VIDEOS.find(x => x.id === el.dataset.id); if (!v) return;
    modal(v.title, `<video src="${v.file}" poster="${v.file.replace('.mp4', '.jpg')}" controls autoplay muted playsinline style="width:100%;max-height:70vh;border-radius:14px;background:#000"></video>
      <div class="actions"><button class="btn ghost grow" data-act="help">Back to Help</button></div>`);
  },
  'wn-jump'(el) { const t = document.getElementById('wn-' + el.dataset.v.replace(/\W/g, '')); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  async export() {
    const data = {}; for (const t of TABLES) data[t] = await store.all(t);
    download(`${ymd(new Date())}_Somasu_Backup.json`, JSON.stringify({ app: 'Somasu', version: VERSION, exported: new Date().toISOString(), data }, null, 2), 'application/json');
  },
  'reset-sample'() { confirmBox('Start again?', 'This clears everything on this device and reloads the sample data.', 'Start again', async () => { store.reset(true); location.reload(); }); },
  async install() { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; render(); } },
  whatsnew(el) { showWhatsNew(el.dataset.v); }
};

/* ------------------------------------------------------------------ events wiring */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'INPUT') return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  Promise.resolve(fn(el, e)).catch(fail);
});
document.addEventListener('change', e => { const el = e.target.closest('input[data-act]'); if (el && ACT[el.dataset.act]) ACT[el.dataset.act](el, e); });
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  const btn = f.querySelector('[type=submit]'); if (btn) btn.disabled = true;
  Promise.resolve(SAVE[f.dataset.form](f, f.dataset.id || null)).catch(err => { showErr(f, 'Couldn’t save: ' + (err.message || err)); }).finally(() => { if (btn) btn.disabled = false; });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && SCAN.stream) closeModal(); });

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (S.tab === 'more') render(); });

/* ------------------------------------------------------------------ sign-in (family mode) */
// Passwords: 10+ characters with a capital, a small letter and a number (same rule as
// St Kenelm's; set the same in Supabase › Authentication › Sign In / Providers › Email).
const PW_RULES = [[p => p.length >= 10, 'At least 10 characters'], [p => /[A-Z]/.test(p), 'A capital letter'], [p => /[a-z]/.test(p), 'A small letter'], [p => /\d/.test(p), 'A number']];
const pwOK = p => PW_RULES.every(([f]) => f(p));
const pwChecklist = p => `<ul class="pwcheck">${PW_RULES.map(([f, t]) => `<li class="${f(p) ? 'ok' : ''}">${f(p) ? '✓' : '○'} ${t}</li>`).join('')}</ul>`;
function passwordFields(form) {
  const a = form.querySelector('[name=pw1]'), c = form.querySelector('[name=pw2]'), list = form.querySelector('.pwlist');
  const upd = () => { list.innerHTML = pwChecklist(a.value) + (c.value && c.value !== a.value ? '<p class="small" style="color:var(--danger);margin:4px 0 0">The two passwords don’t match yet.</p>' : ''); };
  a.addEventListener('input', upd); c.addEventListener('input', upd); upd();
  return () => {
    if (!pwOK(a.value)) return 'The new password doesn’t meet all four rules yet.';
    if (a.value !== c.value) return 'The two passwords don’t match.';
    return null;
  };
}
// Password box with a Show / Hide button (R8). One handler for every password box in the app;
// boxes go back to hidden when the form is sent, so password managers still recognise them.
const pwBox = (id, name, ac, req = true) => `<div class="pwwrap"><input id="${id}" type="password" name="${name}" autocomplete="${ac}" ${req ? 'required' : ''} spellcheck="false" autocapitalize="off"><button type="button" class="pwshow" aria-controls="${id}" aria-pressed="false" aria-label="Show password">Show</button></div><p class="capsnote" role="status" hidden>Caps Lock is on</p>`;
function setPwShown(btn, shown) {
  const inp = btn.parentNode.querySelector('input'); if (!inp) return;
  inp.type = shown ? 'text' : 'password';
  btn.textContent = shown ? 'Hide' : 'Show';
  btn.setAttribute('aria-pressed', String(shown)); btn.setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.pwshow'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const inp = b.parentNode.querySelector('input'), shown = inp.type === 'password';
  setPwShown(b, shown); inp.focus(); try { const n = inp.value.length; inp.setSelectionRange(n, n); } catch (_) {}
}, true);
// "Caps Lock is on" note under password boxes (computers; phone keyboards don't report it).
const capsCheck = e => {
  const inp = e.target; if (!inp || !inp.closest || !inp.closest('.pwwrap') || typeof e.getModifierState !== 'function') return;
  const note = inp.closest('.pwwrap').nextElementSibling; if (!note || !note.classList.contains('capsnote')) return;
  note.hidden = !e.getModifierState('CapsLock');
};
document.addEventListener('keydown', capsCheck, true); document.addEventListener('keyup', capsCheck, true);
document.addEventListener('focusout', e => { const w = e.target && e.target.closest && e.target.closest('.pwwrap'); if (w && w.nextElementSibling && w.nextElementSibling.classList.contains('capsnote')) w.nextElementSibling.hidden = true; }, true);
document.addEventListener('submit', e => { e.target.querySelectorAll && e.target.querySelectorAll('.pwshow').forEach(b => setPwShown(b, false)); }, true);
const NEW_PW_FIELDS = `<div class="f"><label for="pw1">New password</label>${pwBox('pw1', 'pw1', 'new-password')}</div>
    <div class="f"><label for="pw2">Type it again</label>${pwBox('pw2', 'pw2', 'new-password')}<div class="pwlist"></div></div>`;

function signInScreen(msg, info) {
  $('#app').innerHTML = `<div class="signin"><div class="box">
    <img src="icon-192.png" alt="">
    <h1>Somasu</h1><p>The Somiah family planner. Sign in with your email and password.</p>
    ${msg ? `<div class="err">${esc(msg)}</div>` : ''}${info ? `<div class="banner">${esc(info)}</div>` : ''}
    <form id="s1" autocomplete="on">
      <div class="f"><label for="em">Email</label><input id="em" type="email" name="email" required autocomplete="username" value="${esc(store_get('somasu-email', ''))}"></div>
      <div class="f"><label for="pw">Password</label>${pwBox('pw', 'password', 'current-password')}</div>
      <div class="actions"><button class="btn dark grow" type="submit">Sign in</button></div>
      <p class="small" style="text-align:center;margin-bottom:0"><a href="#" id="forgot">Forgotten your password?</a></p></form>
    <form id="s2" class="hidden" autocomplete="on">
      <p class="small">Type your email and we’ll send you a link to set a new password. Open the link on any device, set the password, then sign in here with it.</p>
      <div class="f"><label for="em2">Email</label><input id="em2" type="email" name="email" required autocomplete="username"></div>
      <div class="actions"><button class="btn ghost" type="button" id="back">Back</button><button class="btn dark grow" type="submit">Email me a link</button></div></form>
  </div></div>`;
  const s1 = $('#s1'), s2 = $('#s2');
  if (!s1.email.value) s1.email.focus(); else s1.password.focus();
  s1.onsubmit = async e => {
    e.preventDefault(); const email = s1.email.value.trim().toLowerCase(); store_set('somasu-email', email);
    const b = s1.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Signing in…';
    const { error } = await client.auth.signInWithPassword({ email, password: s1.password.value });
    if (error) { b.disabled = false; b.textContent = 'Sign in'; return signInScreen(/invalid|credentials/i.test(error.message) ? 'That email or password isn’t right. Try again, or use “Forgotten your password?”.' : /rate|too many/i.test(error.message) ? 'Too many tries. Wait a few minutes and try again.' : error.message); }
  };
  $('#forgot').onclick = e => { e.preventDefault(); s1.classList.add('hidden'); s2.classList.remove('hidden'); s2.email.value = s1.email.value; s2.email.focus(); };
  $('#back').onclick = () => { s2.classList.add('hidden'); s1.classList.remove('hidden'); };
  s2.onsubmit = async e => {
    e.preventDefault(); const email = s2.email.value.trim().toLowerCase();
    const b = s2.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Sending…';
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error && /rate|too many|seconds/i.test(error.message)) return signInScreen('Too many emails just now. Wait a few minutes and try again.');
    // Same message whether or not the email is on file, so the page never confirms who's a member.
    signInScreen(null, 'If that email is set up for Somasu, a link to set a new password is on its way. Check spam if it hasn’t arrived in a few minutes.');
  };
}
// Shown after opening a "reset password" link (also used by Family › Change password).
function setPasswordScreen() {
  $('#app').innerHTML = `<div class="signin"><div class="box">
    <img src="icon-192.png" alt=""><h1>Set a new password</h1><p>For ${esc(S.user && S.user.email || 'your account')}.</p>
    <form id="np" autocomplete="on">${NEW_PW_FIELDS}<div class="actions"><button class="btn dark grow" type="submit">Save password</button></div></form></div></div>`;
  const f = $('#np'), check = passwordFields(f);
  f.onsubmit = async e => {
    e.preventDefault(); const bad = check(); if (bad) return showErr(f, bad);
    const { error } = await client.auth.updateUser({ password: f.pw1.value });
    if (error) return showErr(f, /same|different/i.test(error.message) ? 'Choose a password you haven’t used for Somasu before.' : error.message);
    history.replaceState(null, '', location.pathname); toast('Password saved'); startApp();
  };
}
function changePasswordForm() {
  modal('Change password', `<form data-form="password" autocomplete="on"><input type="email" autocomplete="username" value="${esc(S.user.email)}" hidden>${NEW_PW_FIELDS}
    <div class="actions"><button class="btn dark grow" type="submit">Save new password</button></div>
    <p class="small muted">You’ll stay signed in on this device. Other devices keep working until they sign out.</p></form>`, s => { s._check = passwordFields(s.querySelector('form')); });
}

/* ------------------------------------------------------------------ start */
async function startApp() {
  try { await loadAll(); }
  catch (e) { console.error(e); $('#app').innerHTML = `<div class="signin"><div class="box"><h1>Can’t reach the family database</h1><p>${esc(e.message || e)}</p><button class="btn dark" onclick="location.reload()">Try again</button></div></div>`; return; }
  if (FAMILY_MODE && !S.me) {
    $('#app').innerHTML = `<div class="signin"><div class="box"><img src="icon-192.png" alt=""><h1>Nearly there</h1><p>You're signed in as <b>${esc(S.user.email)}</b>, but that address isn't on the family list yet. Ask a family admin to add you under Family › Family members.</p><button class="btn ghost" id="so">Sign out</button></div></div>`;
    $('#so').onclick = async () => { await client.auth.signOut(); location.reload(); };
    return;
  }
  let t = {};
  store.onChange(table => { // reload just the table that changed, at most a few times a second
    if (table === '*') return loadAll().then(render);
    clearTimeout(t[table]); t[table] = setTimeout(async () => { await loadAll([table]); if (table === 'calendars') refreshCalendars(); render(); }, 150);
  });
  draw();
  applyRoute();
  pushRefresh().then(render).catch(e => console.warn('push', e));
  refreshCalendars();
  setInterval(() => refreshCalendars(), 15 * 60000);
  setInterval(render, 60000); // keep "today", "2m ago" and the now-line current
  window.addEventListener('focus', () => FAMILY_MODE && loadAll().then(render).catch(() => {}));
}

async function boot() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (!FAMILY_MODE) { store = LocalStore(); return startApp(); }
  if (!window.supabase) { $('#app').innerHTML = `<div class="signin"><div class="box"><h1>You're offline</h1><p>Somasu needs a connection to sign in. Try again when you're back online.</p><button class="btn dark" onclick="location.reload()">Try again</button></div></div>`; return; }
  // A "reset password" email link lands here with #...type=recovery; read it before Supabase tidies the address.
  const recovering = /type=recovery/.test(location.hash + location.search);
  const linkError = /error_description=([^&]+)/.exec(location.hash + location.search);
  client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
  const { data } = await client.auth.getSession();
  let started = false;
  const begin = session => {
    if (started) return; started = true; S.user = session.user; store = SupaStore(client);
    if (recovering) setPasswordScreen(); else startApp();
  };
  client.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY' && session) { S.user = session.user; store = store || SupaStore(client); started = true; return setPasswordScreen(); }
    if (session) begin(session);
    if (!session && ev === 'SIGNED_OUT') location.reload();
  });
  if (data.session) begin(data.session);
  else if (linkError) { history.replaceState(null, '', location.pathname); signInScreen('That link has expired or was already used. Ask for a new one below.'); }
  else signInScreen();
}

/* Make room for Netlify's free-plan badge if it appears (see index.html styles). */
(function watchBadge() {
  const fit = () => {
    const f = document.getElementById('nl-badge-frame');
    if (!f) return false;
    const h = Math.ceil(f.getBoundingClientRect().height) || 64;
    document.documentElement.style.setProperty('--badge-h', h + 'px');
    document.documentElement.classList.add('has-badge');
    return true;
  };
  if (fit()) return;
  const mo = new MutationObserver(() => { if (fit()) mo.disconnect(); });
  mo.observe(document.body, { childList: true });
  window.addEventListener('resize', fit);
})();

window.__somasu = { S, parseICS, occurrences, guessCat, eventsBetween, normTitle, calOwners, render, validBarcode, offAisle, lookupBarcode, binCollections, nextBin, binsCfg }; // handy for testing in the browser console
boot();
})();
