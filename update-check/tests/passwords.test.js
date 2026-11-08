// Somasu password-box test (26 R8): Show / Hide on sign-in, Change password and the reset screen, plus the Caps Lock note.
// Supabase sign-in is mocked; nothing touches the family database.
// Usage: serve 01_Site/public (with its real config.js) on a local port, then: node passwords.test.js <port>
const PORT=process.argv[2];
const {chromium}=require('playwright');
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:'u1',email:'andrew.somiah@googlemail.com',exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'})+'.sig';
const user={id:'u1',email:'andrew.somiah@googlemail.com',aud:'authenticated',role:'authenticated'};
const H={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','content-type':'application/json'};
(async()=>{const b=await chromium.launch({env:{...process.env,LANG:'en_GB.UTF-8',LC_ALL:'en_GB.UTF-8'}});const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'en-GB'});
 const log=[];const errs=[];
 await ctx.route(u=>u.hostname.endsWith('supabase.co'),async r=>{const req=r.request();const u=new URL(req.url());
  if(req.method()==='OPTIONS') return r.fulfill({status:200,headers:H});
  log.push(req.method()+' '+u.pathname+u.search.slice(0,30));
  if(u.pathname==='/auth/v1/token'){const body=JSON.parse(req.postData()||'{}'); if(body.password!=='Correct1234') return r.fulfill({status:400,headers:H,body:JSON.stringify({error:'invalid_grant',error_description:'Invalid login credentials',msg:'Invalid login credentials',code:'invalid_credentials'})}); return r.fulfill({status:200,headers:H,body:JSON.stringify({access_token:jwt,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r1',user})});}
  if(u.pathname==='/auth/v1/user') return r.fulfill({status:200,headers:H,body:JSON.stringify(user)});
  if(u.pathname==='/auth/v1/recover') return r.fulfill({status:200,headers:H,body:'{}'});
  if(u.pathname==='/auth/v1/logout') return r.fulfill({status:204,headers:H,body:''});
  if(u.pathname.startsWith('/rest/v1/members')) return r.fulfill({status:200,headers:H,body:JSON.stringify([{id:'m1',name:'Andy',email:'andrew.somiah@googlemail.com',colour:'#10704E',is_admin:true}])});
  if(u.pathname.startsWith('/rest/v1/lists')) return r.fulfill({status:200,headers:H,body:JSON.stringify([{id:'l1',name:'Weekly shop',kind:'shopping',sort:1}])});
  if(u.pathname.startsWith('/rest/v1/')) return r.fulfill({status:200,headers:H,body:'[]'});
  return r.fulfill({status:404,headers:H,body:'{}'});});
 await ctx.route('**/fonts.googleapis.com/**',r=>r.abort());

 const OUT=require('os').tmpdir()+'/'; const fs=require('fs'); const F='/mnt/user-data/uploads/CLAUDE_MASTER/Somiah_Group_Branding/Fonts/Sora/';
 let fontCss=''; try{fontCss=`@font-face{font-family:Sora;src:url(data:font/ttf;base64,${fs.readFileSync(F+'Sora-Regular.ttf').toString('base64')})}@font-face{font-family:Sora;font-weight:500 900;src:url(data:font/ttf;base64,${fs.readFileSync(F+'Sora-SemiBold.ttf').toString('base64')})}`;}catch(e){}
 const res={}; const ok=(n,c,x)=>{res[n]=c?'PASS':'FAIL '+JSON.stringify(x)};
 const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/Failed to load|ERR_/.test(m.text()))errs.push(m.text())});
 await p.goto('http://localhost:'+PORT+'/'); await p.addStyleTag({content:fontCss}); await p.waitForTimeout(800);
 await p.fill('#em','andrew.somiah@googlemail.com'); await p.fill('#pw','Correct1234');
 ok('sign-in hidden at start', await p.getAttribute('#pw','type')==='password');
 ok('button says Show', (await p.textContent('#s1 .pwshow')).trim()==='Show');
 await p.click('#s1 .pwshow'); ok('shows text', await p.getAttribute('#pw','type')==='text'); ok('says Hide', (await p.textContent('#s1 .pwshow')).trim()==='Hide');
 ok('aria-pressed true', await p.getAttribute('#s1 .pwshow','aria-pressed')==='true');
 ok('focus stays in box', await p.evaluate(()=>document.activeElement.id)==='pw');
 ok('value kept', await p.inputValue('#pw')==='Correct1234');
 await p.mouse.move(5,5); await p.waitForTimeout(150); await p.screenshot({path:OUT+'u-signin-show.png'});
 await p.click('#s1 .pwshow'); ok('hides again', await p.getAttribute('#pw','type')==='password');
 await p.click('#s1 .pwshow');
 // Enter key in the box should still sign in, not toggle
 await p.press('#pw','Enter'); await p.waitForTimeout(1500);
 ok('Enter signs in', await p.isVisible('nav.nav'));
 await p.click('nav.nav [data-tab=more]'); await p.click('[data-act=change-password]'); await p.waitForTimeout(300);
 await p.fill('#pw1','NewPassword99'); await p.fill('#pw2','NewPassword9');
 const btns=await p.$$('.sheet .pwshow'); ok('two buttons in change password', btns.length===2, btns.length);
 await btns[0].click(); await btns[1].click(); await p.waitForTimeout(150);
 ok('both shown', (await p.getAttribute('#pw1','type'))==='text' && (await p.getAttribute('#pw2','type'))==='text');
 ok('sheet still open after toggle', await p.isVisible('.sheet'));
 await p.fill('#pw2','NewPassword99'); await p.mouse.move(5,5); await p.evaluate(()=>document.activeElement.blur()); await p.evaluate(()=>{const s=document.querySelector('.sheet');s&&s.scrollTo(0,0)});
 await p.screenshot({path:OUT+'u-change-password-show.png'});
 await p.fill('#pw2','NewPassword99'); await p.click('form[data-form=password] [type=submit]'); await p.waitForTimeout(800);
 ok('saved and closed', !(await p.isVisible('.sheet')));
 // recovery screen
 const p2=await ctx.newPage(); p2.on('pageerror',e=>errs.push(e.message));
 await p2.goto('about:blank');
 await p2.goto(`http://localhost:${PORT}/#access_token=${jwt}&expires_at=${Math.floor(Date.now()/1000)+3600}&expires_in=3600&refresh_token=r1&token_type=bearer&type=recovery`); await p2.waitForTimeout(1500);
 ok('recovery screen', /new password/i.test(await p2.textContent('h1')));
 await p2.fill('#pw1','Another12345'); await p2.click('#np .pwshow >> nth=0'); ok('recovery toggle', await p2.getAttribute('#pw1','type')==='text');
 // desktop
 const d=await b.newPage({viewport:{width:1280,height:800}}); await d.goto('http://localhost:'+PORT+'/?x'); await d.evaluate(()=>localStorage.clear()); await d.goto('http://localhost:'+PORT+'/'); await d.addStyleTag({content:fontCss}); await d.waitForTimeout(800);
 await d.fill('#pw','Secret12345'); await d.click('.pwshow'); await d.screenshot({path:OUT+'d-signin-show.png'});
 await d.focus('#pw'); await d.evaluate(()=>document.querySelector('#pw').dispatchEvent(new KeyboardEvent('keyup',{key:'X',modifierCapsLock:true,bubbles:true}))); await d.waitForTimeout(100); await d.screenshot({path:OUT+'d-caps.png'}); ok('caps note shows', await d.isVisible('.capsnote')); await d.evaluate(()=>document.querySelector('#pw').dispatchEvent(new KeyboardEvent('keyup',{key:'y',bubbles:true}))); ok('caps note hides', !(await d.isVisible('.capsnote')));
 const bb=await d.$eval('.pwshow',e=>{const r=e.getBoundingClientRect(),i=e.parentNode.querySelector('input').getBoundingClientRect();return [r.right<=i.right, r.top>=i.top, r.bottom<=i.bottom]});
 ok('button inside box (desktop)', bb.every(Boolean), bb);
 const fails=Object.entries(res).filter(([k,v])=>v!=='PASS'); console.log(JSON.stringify(res,null,1)); console.log('errors',errs); console.log(`${Object.keys(res).length-fails.length} passed, ${fails.length+(errs.length?1:0)} failed`); process.exitCode=fails.length||errs.length?1:0; await b.close();
})();
