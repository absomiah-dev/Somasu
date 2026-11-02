// Somasu server-function tests. Run from the site folder after npm ci:  SITE=$PWD node <this file>
const SITE=(process.env.SITE||process.cwd()).replace(/\\/g,'/');
let pass=0,fail=0;const ok=(n,c,x)=>{c?pass++:fail++;console.log(c?'PASS':'FAIL',n,c?'':x)};
const call=async(url,auth)=>{const m=await import('file://'+SITE+'/netlify/functions/ics.mjs?'+Math.random());return m.default(new Request('https://somasu.netlify.app/api/ics?url='+encodeURIComponent(url),{headers:auth?{authorization:auth}:{}}));};
globalThis.fetch=async(u,o)=>{u=String(u); if(u.includes('/auth/v1/user')) return new Response('{}',{status:(o.headers.authorization==='Bearer good')?200:401});
 if(u.includes('notcal')) return new Response('<html>hi</html>'); return new Response('BEGIN:VCALENDAR\nEND:VCALENDAR');};
process.env.SUPABASE_URL='https://x.supabase.co'; process.env.SUPABASE_KEY='k';
let r=await call('https://school.example.org/cal.ics','Bearer good'); ok('signed in: school host allowed',r.status===200,r.status);
r=await call('https://school.example.org/cal.ics'); ok('no auth refused',r.status===401,r.status);
r=await call('https://school.example.org/cal.ics','Bearer bad'); ok('bad auth refused',r.status===401,r.status);
for(const u of ['https://localhost/x.ics','https://192.168.1.1/x.ics','https://10.0.0.5/x','https://169.254.169.254/latest','https://8.8.8.8/x','http://school.example.org/x.ics','https://printer.local/x','https://example.org:8443/x.ics']){r=await call(u,'Bearer good'); ok('blocked '+u,r.status===403,r.status);}
r=await call('webcal://p01-caldav.icloud.com/published/2/abc','Bearer good'); ok('webcal converted',r.status===200,r.status);
r=await call('https://example.org/notcal','Bearer good'); ok('non-calendar refused',r.status===422,r.status);
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_KEY;
r=await call('https://school.example.org/cal.ics'); ok('no-auth mode: unknown host refused',r.status===403,r.status);
r=await call('https://calendar.google.com/calendar/ical/x/basic.ics'); ok('no-auth mode: google allowed',r.status===200,r.status);
console.log(`${pass} passed, ${fail} failed`);
