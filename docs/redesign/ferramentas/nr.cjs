// Não-regressão extra: ordem de foco, sem motion.js, requisições ao Supabase, vídeo do teste.
const { chromium } = require('playwright');
const path=require('path');
const AN='http://localhost:4174', DE='http://localhost:4173';
async function ctx(b,opts={}){const c=await b.newContext({viewport:{width:1280,height:900},...opts});await c.addInitScript(()=>localStorage.setItem('wavetype_theme','light'));
const reqs=[];await c.route('https://wt.supabase.co/**',r=>{reqs.push(r.request().method()+' '+new URL(r.request().url()).pathname);r.fulfill({status:200,contentType:'application/json',body:'[]'})});return [c,reqs];}
async function foco(b,base,pg){const [c]=await ctx(b);const p=await c.newPage();await p.goto(base+pg,{waitUntil:'networkidle'});const seq=[];
for(let i=0;i<45;i++){await p.keyboard.press('Tab');seq.push(await p.evaluate(()=>{const e=document.activeElement;return e.tagName+(e.id?'#'+e.id:'')+'|'+(e.getAttribute('href')||e.getAttribute('name')||e.textContent.trim().slice(0,24))}));}
await c.close();return seq;}
(async()=>{const b=await chromium.launch();let ok=true;
for(const pg of ['/index.html','/cadastro.html','/login.html','/escolas.html']){const a=await foco(b,AN,pg),d=await foco(b,DE,pg);const igual=JSON.stringify(a)===JSON.stringify(d);ok=ok&&igual;console.log('ordem de foco',pg,igual?'IGUAL':'DIFERENTE');if(!igual)console.log(a.map((x,i)=>x===d[i]?'':i+': '+x+' -> '+d[i]).filter(Boolean).slice(0,5));}
// Sem motion.js
{const [c]=await ctx(b);await c.route(/motion.*\.js$/,r=>r.abort());const p=await c.newPage();const erros=[];p.on('pageerror',e=>erros.push(e.message));
await p.goto(DE+'/index.html',{waitUntil:'networkidle'});const r=await p.evaluate(()=>({motion:document.documentElement.classList.contains('wt-motion'),ocultos:[...document.querySelectorAll('.experience-card,.step-item,.product-browser')].filter(e=>getComputedStyle(e).opacity!=='1').length}));
console.log('sem motion.js',JSON.stringify(r),'erros',erros.length);ok=ok&&!r.motion&&r.ocultos===0&&!erros.length;await c.close();}
// Requisições ao Supabase (área do aluno)
const ses=(sub)=>{const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');return JSON.stringify({access_token:`${b64({alg:'HS256'})}.${b64({sub,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.c2ln`,refresh_token:'r',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:sub,email:'a@x.com'}})};
for(const pg of ['/index.html','/login.html','/app/aluno/index.html','/app/professor/turmas.html']){const res=[];for(const base of [AN,DE]){const [c,reqs]=await ctx(b);await c.addInitScript(v=>localStorage.setItem('sb-wt-auth-token',v),ses('20000000-0000-0000-0000-000000000001'));const p=await c.newPage();await p.goto(base+pg,{waitUntil:'networkidle'});await p.waitForTimeout(700);res.push(reqs.sort().join(','));await c.close();}
console.log('requisições Supabase',pg,res[0]===res[1]?'IGUAIS':'DIFERENTES');ok=ok&&res[0]===res[1];}
// Vídeo do hero e do teste
{const c=await b.newContext({viewport:{width:1280,height:800},recordVideo:{dir:path.join(__dirname,'video'),size:{width:1280,height:800}}});await c.addInitScript(()=>localStorage.setItem('wavetype_theme','light'));
await c.route('https://wt.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));const p=await c.newPage();await p.goto(DE+'/index.html',{waitUntil:'networkidle'});await p.waitForTimeout(1200);
await p.click('.segment[data-value="15"]').catch(()=>{});await p.waitForTimeout(400);await p.click('#typing-stage');
const t=await p.evaluate(()=>[...document.querySelectorAll('#words-wrapper .word')].slice(0,40).map(w=>w.dataset.text).join(' '));
let i=0;for(const ch of t){if(i++%23===7)await p.keyboard.type('x');await p.keyboard.type(ch,{delay:70});if(await p.evaluate(()=>document.getElementById('typing-shell').classList.contains('finished')))break;}
await p.waitForTimeout(2500);await p.mouse.wheel(0,900);await p.waitForTimeout(1500);await p.mouse.wheel(0,900);await p.waitForTimeout(1500);await c.close();}
await b.close();console.log(ok?'NAO-REGRESSAO OK':'HA DIFERENCAS');})();
