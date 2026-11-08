// Somasu members-and-sign-ins UI test (26 R9). Supabase and /api/member-login are mocked.
// Usage: serve 01_Site/public (real config.js) on a local port, then: node members.test.js <port>
// Checks: admin adds a member (sign-in made first, member row saved with Admin off), Make one for me,
// errors shown, edit/new password/new email, remove, 19 named colours, non-admins can't change the family.
const {chromium}=require('playwright'); const PORT=process.argv[2];
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const EMAIL='andrew.somiah@googlemail.com';
const jwt=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:'u1',email:EMAIL,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'})+'.sig';
const user={id:'u1',email:EMAIL,aud:'authenticated',role:'authenticated'};
const H={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-type':'application/json'};
(async()=>{
 const b=await chromium.launch(); const res={}; const ok=(n,c,x)=>{res[n]=c?'PASS':'FAIL '+JSON.stringify(x)};
 for (const role of ['admin','member']) {
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'en-GB'}); const errs=[];
  let members=[{id:'m1',name:'Andy',email:EMAIL,colour:'#3B6A50',is_admin:role==='admin'},{id:'m2',name:'Kofi',email:'kofi@example.com',colour:'#B4532A',is_admin:false}];
  const dbLog=[], api=[]; let apiReply={created:true};
  await ctx.route(u=>u.hostname.endsWith('supabase.co'),async r=>{const req=r.request();const u=new URL(req.url());
   if(req.method()==='OPTIONS') return r.fulfill({status:200,headers:H});
   if(u.pathname==='/auth/v1/token') return r.fulfill({status:200,headers:H,body:JSON.stringify({access_token:jwt,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r1',user})});
   if(u.pathname==='/auth/v1/user') return r.fulfill({status:200,headers:H,body:JSON.stringify(user)});
   if(u.pathname.startsWith('/rest/v1/members')){
     if(req.method()!=='GET'){ dbLog.push(req.method()+' '+(req.postData()||u.search)); if(req.method()==='POST'){const row=JSON.parse(req.postData()); const x=Array.isArray(row)?row[0]:row; x.id=x.id||'m'+(members.length+1); members.push(x); return r.fulfill({status:201,headers:H,body:JSON.stringify([x])});} if(req.method()==='DELETE'){const id=(u.search.match(/id=eq\.([^&]+)/)||[])[1]; members=members.filter(m=>m.id!==id); return r.fulfill({status:204,headers:H,body:''});} if(req.method()==='PATCH'){const id=(u.search.match(/id=eq\.([^&]+)/)||[])[1]; const m=members.find(m=>m.id===id); Object.assign(m,JSON.parse(req.postData())); return r.fulfill({status:200,headers:H,body:JSON.stringify([m])});} }
     return r.fulfill({status:200,headers:H,body:JSON.stringify(members)}); }
   if(u.pathname.startsWith('/rest/v1/')) return r.fulfill({status:200,headers:H,body:'[]'});
   if(u.pathname.startsWith('/realtime')) return r.abort();
   return r.fulfill({status:404,headers:H,body:'{}'});});
  await ctx.route('**/api/member-login',async r=>{ const req=r.request(); api.push({auth:req.headers()['authorization'],body:JSON.parse(req.postData())}); const rep=typeof apiReply==='function'?apiReply():apiReply; return r.fulfill({status:rep.status||200,headers:{'content-type':'application/json'},body:JSON.stringify(rep.body||rep)}); });
  await ctx.route('**/api/notify',r=>r.fulfill({status:200,body:'{}'}));
  await ctx.route('**/fonts.googleapis.com/**',r=>r.abort());
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load|ERR_|WebSocket/.test(m.text()))errs.push(m.text())});
  await p.goto('http://localhost:'+PORT+'/'); await p.waitForTimeout(800);
  await p.fill('#em',EMAIL); await p.fill('#pw','Correct1234'); await p.click('#s1 [type=submit]'); await p.waitForTimeout(1500);
  await p.click('nav.nav [data-tab=more]'); await p.waitForTimeout(300);
  if (role==='member') {
    ok('member: no Add family member button', !(await p.isVisible('[data-act=new-member]')));
    ok('member: rows not editable', (await p.$$('[data-act=edit-member]')).length===0);
  } else {
    await p.click('[data-act=new-member]'); await p.waitForTimeout(300);
    ok('admin: starting password box shown', await p.isVisible('#mP'));
    ok('admin: Admin unticked by default', !(await p.isChecked('input[name=is_admin]')));
    const sw=await p.$$eval('.sheet .swatches input',e=>e.map(x=>({v:x.value,c:x.checked,n:x.getAttribute('aria-label')})));
    ok('colours: 19 to choose from, all named', sw.length===19 && sw.every(x=>x.n && !/^#/.test(x.n)), sw.length);
    const chosen=(sw.find(x=>x.c)||{}).v; ok('colours: new person gets a colour nobody uses', chosen && !['#3B6A50','#B4532A'].includes(chosen), chosen);
    ok('admin: old "invite them in Supabase" hint gone', !/Supabase/.test(await p.textContent('.sheet')));
    await p.fill('#mN','Ammita'); await p.fill('#mE','AandaSomiah@gmail.com');
    await p.click('[data-act=gen-pw]'); await p.waitForTimeout(150);
    const gen=await p.inputValue('#mP'); ok('Make one for me: valid password, shown', /^[A-Z][a-z]+-[a-z]+-\d\d$/.test(gen) && gen.length>=10 && await p.getAttribute('#mP','type')==='text', gen);
    await p.mouse.move(2,2); await p.screenshot({path:require('os').tmpdir()+'/somasu-member-add.png'});
    apiReply={status:500,body:{error:'Somasu’s secret key isn’t set up on Netlify (SUPABASE_SECRET_KEY).'}};
    await p.click('form[data-form=member] [type=submit]'); await p.waitForTimeout(500);
    ok('server error shown, member not saved', /secret key/.test(await p.textContent('.sheet .err')) && !dbLog.some(l=>l.startsWith('POST')), dbLog);
    apiReply={created:true}; api.length=0;
    await p.click('form[data-form=member] [type=submit]'); await p.waitForTimeout(900);
    ok('create call: right email, name, password, signed-in token', api[0] && api[0].body.action==='create' && api[0].body.email==='aandasomiah@gmail.com' && api[0].body.name==='Ammita' && api[0].body.password===gen && /^Bearer /.test(api[0].auth||''), api);
    ok('member row saved without admin', dbLog.some(l=>l.startsWith('POST') && /"is_admin":false/.test(l) && /aandasomiah@gmail.com/.test(l)), dbLog);
    ok('sheet closed after save', !(await p.isVisible('.sheet')));
    // edit with blank password: no sign-in call
    api.length=0; await p.click('[data-act=edit-member][data-id=m2]'); await p.waitForTimeout(300);
    ok('edit: password box optional', (await p.getAttribute('#mP','required'))===null);
    const sw2=await p.$$eval('.sheet .swatches input',e=>e.map(x=>({v:x.value,c:x.checked,n:x.getAttribute('aria-label')})));
    ok('colours: an old colour not in the list is kept as Current colour', sw2[0].v==='#B4532A' && sw2[0].c && sw2[0].n==='Current colour' && sw2.length===20, sw2.slice(0,2));
    await p.click('form[data-form=member] [type=submit]'); await p.waitForTimeout(600);
    ok('edit, blank password: no sign-in change', api.length===0, api);
    // edit with new password
    await p.click('[data-act=edit-member][data-id=m2]'); await p.waitForTimeout(300); await p.fill('#mP','Cedar-amber-77'); apiReply={updated:true};
    await p.click('form[data-form=member] [type=submit]'); await p.waitForTimeout(600);
    ok('edit, new password: set-password call', api.length===1 && api[0].body.action==='set-password' && api[0].body.email==='kofi@example.com', api);
    // change email
    api.length=0; await p.click('[data-act=edit-member][data-id=m2]'); await p.waitForTimeout(300); await p.fill('#mE','kofi.new@example.com');
    await p.click('form[data-form=member] [type=submit]'); await p.waitForTimeout(600);
    ok('edit, new email: sign-in moved first', api[0] && api[0].body.action==='change-email' && api[0].body.email==='kofi@example.com' && api[0].body.new_email==='kofi.new@example.com', api);
    // remove
    api.length=0; apiReply={removed:true}; await p.click('[data-act=edit-member][data-id=m2]'); await p.waitForTimeout(300);
    await p.click('[data-act=delete-member]'); await p.waitForTimeout(300);
    const conf=await p.textContent('.sheet'); ok('remove: warning mentions sign-in', /sign-in is removed too/.test(conf), conf.slice(0,200));
    await p.click('.sheet .btn.danger:last-of-type, .sheet [data-act=confirm-ok]').catch(async()=>{ await p.click('text=Remove >> nth=-1'); });
    await p.waitForTimeout(700);
    ok('remove: sign-in removed, then member row', api[0] && api[0].body.action==='remove' && dbLog.some(l=>l.startsWith('DELETE')), {api,dbLog});
  }
  ok(role+': no console errors', errs.length===0, errs);
  await ctx.close();
 }
 const fails=Object.values(res).filter(v=>v!=='PASS').length; console.log(JSON.stringify(res,null,1)); console.log(`${Object.keys(res).length-fails} passed, ${fails} failed`); await b.close(); process.exitCode=fails?1:0;
})();
