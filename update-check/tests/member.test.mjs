// Somasu member sign-in function tests (26 R9). Run from the site folder: SITE=$PWD node member.test.mjs
const SITE=(process.env.SITE||process.cwd()).replace(/\\/g,'/');
process.env.SUPABASE_URL='https://x.supabase.co'; process.env.SUPABASE_KEY='sb_publishable_x'; process.env.SUPABASE_SECRET_KEY='sb_secret_x';
const fn = await import('file://'+SITE+'/netlify/functions/member-login.mjs');
let pass=0,fail=0; const ok=(n,c,x)=>{c?pass++:fail++;console.log(c?'PASS':'FAIL',n,c?'':JSON.stringify(x))};
const members=[{id:'A',name:'Andy',email:'andy@x.com',is_admin:true},{id:'M',name:'Ammita',email:'ammita@x.com',is_admin:false}];
let users=[{id:'uA',email:'andy@x.com'},{id:'uM',email:'ammita@x.com'}], log=[];
globalThis.fetch=async(url,o={})=>{ const u=new URL(url); const h=o.headers||{};
  if(u.pathname==='/auth/v1/user'){ const t=(h.authorization||'').split(' ')[1]; const m=members.find(x=>x.id===t); return new Response(m?JSON.stringify({email:m.email}):'{}',{status:m?200:401}); }
  if(u.pathname==='/rest/v1/members'){ const e=decodeURIComponent(u.search).match(/email=eq\.(.*)$/)[1]; return Response.json(members.filter(m=>m.email===e)); }
  if(u.pathname.startsWith('/auth/v1/admin/users')){
    log.push({method:o.method||'GET',path:u.pathname,body:o.body?JSON.parse(o.body):null,apikey:h.apikey,auth:h.authorization});
    const id=u.pathname.split('/')[5];
    if(!id&&(o.method||'GET')==='GET') return Response.json({users});
    if(!id&&o.method==='POST'){ const b=JSON.parse(o.body); if(users.some(x=>x.email===b.email)) return new Response(JSON.stringify({code:'email_exists',msg:'A user with this email address has already been registered'}),{status:422}); users.push({id:'u'+users.length,email:b.email}); return Response.json({id:'new'}); }
    if(o.method==='PUT'){ const b=JSON.parse(o.body); const x=users.find(y=>y.id===id); if(b.email) x.email=b.email; return Response.json(x); }
    if(o.method==='DELETE'){ users=users.filter(y=>y.id!==id); return Response.json({}); }
  }
  throw new Error('unexpected '+url); };
const call=async(who,body,method='POST')=>{ const r=await fn.default(new Request('https://site/api/member-login',{method,headers:{authorization:'Bearer '+who,'content-type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined})); return {status:r.status,j:await r.json()}; };
let r=await call('nobody',{action:'create',email:'k@x.com',password:'Maple-river-42'}); ok('not signed in: 401', r.status===401, r);
r=await call('M',{action:'create',email:'k@x.com',password:'Maple-river-42'}); ok('not an admin: 403', r.status===403 && !log.length, r);
r=await call('A',{action:'create',email:'k@x.com',password:'short'}); ok('weak password refused', r.status===400 && !log.length, r);
r=await call('A',{action:'create',email:'not-an-email',password:'Maple-river-42'}); ok('bad email refused', r.status===400, r);
log=[]; r=await call('A',{action:'create',email:' Kofi@X.com ',name:'Kofi',password:'Maple-river-42'});
ok('admin creates a confirmed sign-in', r.status===200 && r.j.created && log[0].body.email==='kofi@x.com' && log[0].body.email_confirm===true && log[0].body.user_metadata.display_name==='Kofi', {r,log});
ok('secret key sent only as apikey', log[0].apikey==='sb_secret_x' && !log[0].auth, log[0]);
ok('no admin rights given (no role or admin fields)', !('role' in log[0].body) && !('app_metadata' in log[0].body), log[0].body);
log=[]; r=await call('A',{action:'create',email:'kofi@x.com',password:'Other-pass-99'}); ok('existing sign-in left alone', r.status===200 && r.j.existed && !log.some(l=>l.method==='PUT'), {r,log});
log=[]; r=await call('A',{action:'set-password',email:'kofi@x.com',password:'Cedar-amber-77'}); ok('admin sets a new starting password', r.status===200 && r.j.updated && log.some(l=>l.method==='PUT'&&l.body.password==='Cedar-amber-77'), {r,log});
r=await call('A',{action:'set-password',email:'ghost@x.com',password:'Cedar-amber-77'}); ok('set-password for unknown email: 404', r.status===404, r);
log=[]; r=await call('A',{action:'change-email',email:'kofi@x.com',new_email:'kofi2@x.com'}); ok('change email moves the sign-in', r.j.updated && users.some(u=>u.email==='kofi2@x.com') && log.some(l=>l.body&&l.body.email_confirm===true), {r,users});
r=await call('A',{action:'remove',email:'andy@x.com'}); ok('cannot remove own sign-in', r.status===400 && users.some(u=>u.email==='andy@x.com'), r);
r=await call('M',{action:'remove',email:'andy@x.com'}); ok('non-admin cannot remove', r.status===403 && users.some(u=>u.email==='andy@x.com'), r);
r=await call('A',{action:'remove',email:'kofi2@x.com'}); ok('admin removes a sign-in', r.j.removed && !users.some(u=>u.email==='kofi2@x.com'), {r,users});
r=await call('A',{action:'remove',email:'ghost@x.com'}); ok('removing a missing sign-in is harmless', r.status===200 && r.j.missing, r);
r=await call('A',{action:'hack',email:'k@x.com'}); ok('unknown action refused', r.status===400, r);
r=await call('A',null,'GET'); ok('GET refused', r.status===405, r);
ok('password rule matches the app', fn.strongEnough('Maple-river-42') && !fn.strongEnough('maple-river-42') && !fn.strongEnough('Maple-river') && !fn.strongEnough('Short1A'));
{ const k=process.env.SUPABASE_SECRET_KEY; process.env.SUPABASE_SECRET_KEY=''; r=await call('A',{action:'create',email:'z@x.com',password:'Maple-river-42'}); process.env.SUPABASE_SECRET_KEY=k; ok('missing secret key: plain error, nothing done', r.status===500 && /SUPABASE_SECRET_KEY/.test(r.j.error), r); }
console.log(`${pass} passed, ${fail} failed`); process.exitCode=fail?1:0;
