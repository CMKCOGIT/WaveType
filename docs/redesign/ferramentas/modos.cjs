// Capturas dos modos: escuro, alto contraste, texto grande, movimento reduzido.
const { chromium } = require('playwright');
const path=require('path');const DIR=path.join(__dirname,'redesign',process.argv[3]);require('fs').mkdirSync(DIR,{recursive:true});
(async()=>{const b=await chromium.launch();
const casos=[['escuro',{wavetype_theme:'dark'}],['alto-contraste',{wavetype_theme:'light','wavetype_high-contrast':'true'}],['texto-grande',{wavetype_theme:'light','wavetype_large-text':'true'}],['menos-movimento',{wavetype_theme:'light','wavetype_reduce-motion':'true'}]];
for(const [nome,ls] of casos){for(const pg of ['index','cadastro']){const c=await b.newContext({viewport:{width:1280,height:900}});
await c.addInitScript(v=>{for(const k in v)localStorage.setItem(k,v[k])},ls);
await c.route('https://wt.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const p=await c.newPage();await p.goto(process.argv[2]+'/'+pg+'.html',{waitUntil:'networkidle'});await p.waitForTimeout(600);
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,80));}window.scrollTo({top:0,behavior:'instant'});});
await p.waitForTimeout(600);
if(pg==='index'){const ocultos=await p.evaluate(()=>[...document.querySelectorAll('[data-wt-reveal]:not(.wt-revelado)')].length);console.log(nome,'ocultos',ocultos, 'classes body', await p.evaluate(()=>document.body.className));}
await p.screenshot({path:path.join(DIR,`${pg}-${nome}.png`),fullPage:pg==='index'?false:true});await c.close();}}
await b.close();})();
