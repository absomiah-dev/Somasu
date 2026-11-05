// Somasu server-function tests. Run from the site folder after npm ci:  SITE=$PWD node <this file>
const SITE=(process.env.SITE||process.cwd()).replace(/\\/g,'/');
process.env.SUPABASE_URL='https://x.supabase.co'; process.env.SUPABASE_KEY='sb_publishable_x'; process.env.SUPABASE_SECRET_KEY='sb_secret_x';
process.env.VAPID_PUBLIC_KEY='x'; process.env.VAPID_PRIVATE_KEY='y';
const lib = await import('file://'+SITE+'/netlify/lib/somasu.mjs');
const notify = await import('file://'+SITE+'/netlify/functions/notify.mjs');
const rem = await import('file://'+SITE+'/netlify/functions/reminders.mjs');
let pass=0,fail=0; const ok=(n,c,x)=>{c?pass++:fail++;console.log(c?'PASS':'FAIL',n, c?'':JSON.stringify(x))};
const members=[{id:'A',name:'Andy',email:'andy@x.com'},{id:'M',name:'Ammita',email:'ammita@x.com'},{id:'K',name:'Kofi',email:'kofi@x.com'}];
let subs=[{id:'s1',member_id:'A',endpoint:'https://p/1',p256dh:'k',auth:'a',prefs:{lists:true,events:true,bookings:true,reminders:true}},
 {id:'s2',member_id:'M',endpoint:'https://p/2',p256dh:'k',auth:'a',prefs:{lists:false,events:true,bookings:true,reminders:true}},
 {id:'s3',member_id:'K',endpoint:'https://p/3',p256dh:'k',auth:'a',prefs:{lists:true,events:true,bookings:true,reminders:false}}];
let events=[], claimed=new Set(), deleted=[];
globalThis.fetch = async (url, opts={}) => {
  const u=new URL(url);
  if(u.pathname==='/auth/v1/user'){ const t=(opts.headers.authorization||'').split(' ')[1]; const m=members.find(x=>x.id===t); return new Response(m?JSON.stringify({email:m.email}):'{}',{status:m?200:401}); }
  if(u.pathname==='/rest/v1/members'){ const e=decodeURIComponent(u.search).match(/email=eq\.(.*)$/)[1]; return Response.json(members.filter(m=>m.email===e)); }
  if(u.pathname==='/rest/v1/push_subscriptions'){ if(opts.method==='DELETE'){deleted.push(u.search);return new Response('')} return Response.json(subs); }
  if(u.pathname==='/rest/v1/events') return Response.json(events);
  if(u.pathname==='/rest/v1/reminders_sent'){ if(opts.method==='DELETE') return new Response(''); const b=JSON.parse(opts.body); const k=b.event_id+b.occurs_at; if(claimed.has(k)) return Response.json([]); claimed.add(k); return Response.json([b]); }
  throw new Error('unexpected '+url);
};
let sentLog=[]; lib._setSender(async (sub,payload)=>{ if(sub.endpoint==='https://p/gone'){const e=new Error('gone');e.statusCode=410;throw e;} sentLog.push({to:sub.endpoint,msg:JSON.parse(payload)}); });
const call=(who,body)=>notify.default(new Request('https://site/api/notify',{method:'POST',headers:{authorization:'Bearer '+who,'content-type':'application/json'},body:JSON.stringify(body)}));
// items
sentLog=[]; let r=await call('A',{kind:'items',title:'Weekly shop',texts:['Plantain','Rice','Milk','Eggs'],count:4,url:'#lists/abc'});
ok('items: not to sender, not to lists-off', sentLog.map(s=>s.to).join()==='https://p/3', sentLog);
ok('items: text', sentLog[0]&&sentLog[0].msg.body==='Andy added Plantain, Rice and 2 more' && sentLog[0].msg.url==='./#lists/abc', sentLog[0]);
sentLog=[]; await call('K',{kind:'items',title:'Weekly shop',texts:['Bread','Jam'],count:2});
ok('items: two items text', sentLog[0]&&sentLog[0].msg.body==='Kofi added Bread and Jam', sentLog);
// events for one person
sentLog=[]; await call('A',{kind:'event',action:'added',title:'Swimming',when:'Tue 3 Nov 17:00–18:00',who:['M'],url:'#calendar/2026-11-03'});
ok('event: only to the person it is for', sentLog.length===1&&sentLog[0].to==='https://p/2'&&sentLog[0].msg.title==='Andy added an event', sentLog);
sentLog=[]; await call('A',{kind:'event',action:'cancelled',title:'Dinner',when:'Sat',who:[]});
ok('event for everyone: all but sender', sentLog.length===2 && sentLog[0].msg.title==='Andy cancelled an event', sentLog);
sentLog=[]; await call('M',{kind:'booking',action:'added',title:'Family car',when:'Mon 2 Nov 09:00–13:00',for_name:'Kofi',url:'#bookings/f1/2026-11-02'});
ok('booking text', sentLog.length===2 && sentLog[0].msg.body==='Ammita booked it for Kofi · Mon 2 Nov 09:00–13:00', sentLog);
sentLog=[]; await call('M',{kind:'test'}); ok('test: only own devices', sentLog.length===1&&sentLog[0].to==='https://p/2', sentLog);
r=await call('stranger',{kind:'test'}); ok('stranger refused', r.status===401);
sentLog=[]; r=await (await call('M',{kind:'test'})).json(); ok('test: reports devices and sent', r.devices===1 && r.sent===1, r);
lib._setSender(async ()=>{const e=new Error('forbidden');e.statusCode=403;throw e;}); r=await (await call('M',{kind:'test'})).json(); ok('test: refused push reports failed with code', r.failed===1 && r.sent===0 && r.codes[0]===403, r);
lib._setSender(async (sub,payload)=>{ if(sub.endpoint==='https://p/gone'){const e=new Error('gone');e.statusCode=410;throw e;} sentLog.push({to:sub.endpoint,msg:JSON.parse(payload)}); });
{ const f=globalThis.fetch; globalThis.fetch=async(url,opts={})=>new URL(url).pathname==='/rest/v1/members'?new Response('{"message":"Invalid API key"}',{status:401}):f(url,opts);
  r=await call('A',{kind:'test'}); const j=await r.json(); globalThis.fetch=f;
  ok('wrong secret key: 500 with a plain reason, no key shown', r.status===500 && /SUPABASE_SECRET_KEY/.test(j.error) && !/sb_secret_x/.test(j.error), j); }
r=await call('A',{kind:'hack'}); ok('unknown kind refused', r.status===400);
sentLog=[]; await call('A',{kind:'event',action:'added',title:'x',url:'javascript:alert(1)'}); ok('bad url replaced', sentLog.every(s=>s.msg.url==='./'), sentLog);
subs.push({id:'s9',member_id:'M',endpoint:'https://p/gone',p256dh:'k',auth:'a',prefs:{}}); deleted=[];
r=await (await call('A',{kind:'event',action:'added',title:'x'})).json(); ok('gone device removed', r.gone===1 && deleted.some(d=>d.includes('s9')), {r,deleted}); subs.pop();
// reminders, across the clock change (BST ended 25 Oct 2026)
events=[{id:'e1',title:'Swimming',all_day:false,start_at:'2026-10-20T17:00:00Z',end_at:'2026-10-20T18:00:00Z',who:['M'],location:'Leisure centre',repeat:'weekly',repeat_until:null,skip_dates:[],remind_minutes:30},
        {id:'e2',title:'Bin day',all_day:true,start_at:'2026-11-04T00:00:00Z',end_at:'2026-11-05T00:00:00Z',who:[],location:'',repeat:'none',repeat_until:null,skip_dates:[],remind_minutes:1440},
        {id:'e3',title:'Skipped',all_day:false,start_at:'2026-10-27T17:30:00Z',end_at:'2026-10-27T18:00:00Z',who:[],location:'',repeat:'weekly',repeat_until:null,skip_dates:['2026-11-03'],remind_minutes:0}];
let due=rem.dueReminders(events,new Date('2026-11-03T17:31:00Z'));
ok('weekly 6pm event after clock change reminds at 17:30 GMT', due.some(d=>d.ev.id==='e1'&&d.start.toISOString()==='2026-11-03T18:00:00.000Z'), due.map(d=>[d.ev.id,d.start]));
ok('skipped day not reminded', !due.some(d=>d.ev.id==='e3'), due.map(d=>d.ev.id));
due=rem.dueReminders(events,new Date('2026-11-03T17:15:00Z')); ok('not early', !due.some(d=>d.ev.id==='e1'));
due=rem.dueReminders(events,new Date('2026-11-03T08:02:00Z')); ok('all-day reminder 8am the day before', due.some(d=>d.ev.id==='e2'), due.map(d=>d.ev.id));
const t=rem.reminderText(events[0],new Date('2026-11-03T18:00:00Z'),30); ok('reminder text', t.body==='In 30 minutes · 18:00 · Leisure centre' && t.title==='⏰ Swimming', t);
const t2=rem.reminderText(events[1],new Date('2026-11-04T00:00:00Z'),1440); ok('all-day reminder text', t2.body==='Tomorrow · Wed 4 Nov, all day', t2);
sentLog=[]; claimed=new Set();
await rem.default(); await rem.default(); // simulate two runs at the same time window
ok('reminder run: Swimming to Ammita only, once', true);
// run at a fixed time by faking Date
const RealDate=Date; globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:['2026-11-03T17:31:00Z']))} static now(){return new RealDate('2026-11-03T17:31:00Z').getTime()}};
sentLog=[]; await rem.default(); await rem.default(); globalThis.Date=RealDate;
ok('scheduled run sends once, to Ammita, not Kofi (reminders off)', sentLog.length===1 && sentLog[0].to==='https://p/2', sentLog);
// real web-push encryption with throwaway keys (no network)
const webpush=(await import('file://'+SITE+'/node_modules/web-push/src/index.js')).default; const {publicKey,privateKey}=webpush.generateVAPIDKeys();
const ecdh=(await import('crypto')).createECDH('prime256v1'); ecdh.generateKeys();
const sub={endpoint:'https://fcm.googleapis.com/fcm/send/abc',keys:{p256dh:ecdh.getPublicKey('base64url'),auth:(await import('crypto')).randomBytes(16).toString('base64url')}};
webpush.setVapidDetails('mailto:test@example.com',publicKey,privateKey);
const det=webpush.generateRequestDetails(sub,JSON.stringify({title:'x'}),{TTL:60});
ok('web-push builds an encrypted request', det.headers['Content-Encoding']==='aes128gcm' && det.body.length>0 && /vapid/.test(det.headers.Authorization), det.headers);
console.log(`\n${pass} passed, ${fail} failed`);
