// Checklist da seção 11, determinístico (Math.random semeado + relógio falso). Uso: node checklist.cjs <base>
const { chromium } = require('playwright');
const BASE=process.argv[2];
const SEMENTE=()=>{let s=42;Math.random=()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296;};};
async function abrir(b,pg='/index.html',ls={}){const c=await b.newContext({viewport:{width:1280,height:900}});
await c.addInitScript(SEMENTE);await c.addInitScript(v=>{for(const k in v)localStorage.setItem(k,v[k])},{wavetype_theme:'light',...ls});
await c.route('https://wt.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const p=await c.newPage();const erros=[];p.on('pageerror',e=>erros.push(e.message));p.on('console',m=>{if(m.type()==='error')erros.push(m.text())});
await p.clock.install({time:new Date('2026-10-30T10:00:00Z')});await p.goto(BASE+pg,{waitUntil:'networkidle'});return {c,p,erros};}
const palavras=p=>p.evaluate(()=>[...document.querySelectorAll('#words-wrapper .word')].map(w=>w.dataset.text).join(' '));
const resultado=p=>p.evaluate(()=>Object.fromEntries(['result-wpm','result-raw','result-accuracy','result-consistency','chars-correct','chars-wrong','chars-missed','chars-extra'].map(i=>[i,document.getElementById(i)?.textContent.trim()])));
(async()=>{const b=await chromium.launch();const R={};
// 1) Tempo 15/30/60: inicia na 1ª tecla e encerra no tempo
for(const t of ['15','30','60']){const {c,p,erros}=await abrir(b);await p.click(`.segment[data-control="time"][data-value="${t}"], .segment[data-value="${t}"]`);
await p.clock.runFor(5000);const antesTecla=await p.evaluate(()=>document.getElementById('live-time').textContent);
await p.click('#typing-stage');const txt=await palavras(p);
let k=0;for(const ch of txt.slice(0,40)){await p.keyboard.type(k%17===5?'x':ch);k++;await p.clock.runFor(250);}
const mid=await p.evaluate(()=>[document.getElementById('typing-shell').className,document.getElementById('live-time').textContent]);
await p.clock.runFor(Number(t)*1000);const fim=await p.evaluate(()=>document.getElementById('typing-shell').classList.contains('finished'));
R['tempo_'+t]={antesDaTecla:antesTecla,durante:mid[1],encerrou:fim,resultado:await resultado(p),erros:erros.length};await c.close();}
// 2) Modo/nível geram o mesmo conteúdo
for(const [ctl,val] of [['mode','sentences'],['mode','words'],['level','easy'],['level','advanced']]){const {c,p}=await abrir(b);const sel=`[data-control="${ctl}"] .segment[data-value="${val}"]`;
const existe=await p.locator(sel).count();if(existe)await p.click(sel);else{const alt=await p.evaluate(()=>[...document.querySelectorAll('.segment')].map(s=>s.dataset.control+'='+s.dataset.value));R.segmentos=alt;}
R[`conteudo_${ctl}_${val}`]=(await palavras(p)).slice(0,120);await c.close();}
// 3) Esc e Reiniciar
{const {c,p}=await abrir(b);await p.click('#typing-stage');await p.keyboard.type('abc');await p.clock.runFor(500);await p.keyboard.press('Escape');await p.clock.runFor(300);
const esc=await p.evaluate(()=>[document.getElementById('typing-shell').classList.contains('started'),document.querySelectorAll('.letter.correct,.letter.incorrect').length]);
await p.click('#typing-stage');await p.keyboard.type('ab');await p.click('#restart-button');await p.clock.runFor(300);
const rb=await p.evaluate(()=>[document.getElementById('typing-shell').classList.contains('started'),document.querySelectorAll('.letter.correct,.letter.incorrect').length]);
R.esc=esc;R.reiniciar=rb;await c.close();}
// 4) Backspace, acentos, maiúsculas
{const c=await b.newContext({viewport:{width:1280,height:900}});await c.addInitScript(SEMENTE);await c.route('https://wt.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));const p=await c.newPage();await p.goto(BASE+'/index.html',{waitUntil:'networkidle'});
await p.click('#typing-stage');await p.keyboard.type('ÁéçX',{delay:60});await p.keyboard.press('Backspace',{delay:60});await p.keyboard.press('Backspace',{delay:60});await p.keyboard.type(' ',{delay:60});await p.waitForTimeout(200);
R.teclas=await p.evaluate(()=>[...document.querySelectorAll('#words-wrapper .word')].slice(0,2).map(w=>w.className+':'+[...w.querySelectorAll('.letter')].map(l=>l.className.replace('letter','').trim()||'_').join(',')));await c.close();}
// 5) Modos de acessibilidade persistem após recarregar
{const {c,p}=await abrir(b);await p.click('.accessibility-menu summary');for(const pref of ['large-text','high-contrast','reduce-motion'])await p.click(`.preference-toggle[data-preference="${pref}"]`);
await p.reload({waitUntil:'networkidle'});R.modos=await p.evaluate(()=>[document.body.className,['large-text','high-contrast','reduce-motion'].map(k=>localStorage.getItem('wavetype_'+k)).join(',')]);await c.close();}
// 6) Abas e botões da demonstração
{const {c,p}=await abrir(b);const tabs=await p.locator('.preview-tab-btn').count();R.demo=[];
for(let i=0;i<tabs;i++){await p.locator('.preview-tab-btn').nth(i).click();await p.clock.runFor(300);R.demo.push(await p.evaluate(()=>({titulo:document.getElementById('preview-title')?.textContent.trim(),url:document.getElementById('browser-address-url')?.textContent.trim(),visiveis:[...document.querySelectorAll('.preview-tabpanel')].map(x=>x.style.display||getComputedStyle(x).display),acoes:[...document.querySelectorAll('.product-preview-section a, .product-preview-section button')].filter(e=>e.offsetParent).map(e=>e.textContent.trim().slice(0,30)+'→'+(e.getAttribute('href')||e.dataset.targetTab||''))})));}
await c.close();}
// 7) Links, âncoras e "Pular para o conteúdo"
R.links={};for(const pg of ['/index.html','/escolas.html','/como-funciona.html','/sobre.html','/login.html','/cadastro.html']){const {c,p}=await abrir(b,pg);
R.links[pg]=await p.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>a.textContent.trim().slice(0,22)+'→'+a.getAttribute('href')).join(' | '));
if(pg==='/index.html'){await p.keyboard.press('Tab');const skip=await p.evaluate(()=>document.activeElement.className+'→'+document.activeElement.getAttribute('href'));await p.keyboard.press('Enter');
R.pular=[skip,await p.evaluate(()=>location.hash)];for(const h of ['#conteudo','#teste','#demonstracao','#plataforma']){R['ancora'+h]=await p.evaluate(h=>!!document.querySelector(h),h);}}
await c.close();}
// 8) Teclado no mobile (390px): digitação pelo campo
{const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await c.addInitScript(SEMENTE);await c.route('https://wt.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const p=await c.newPage();await p.goto(BASE+'/index.html',{waitUntil:'networkidle'});await p.tap('#typing-stage');const txt=await palavras(p);await p.keyboard.type(txt.slice(0,12));
R.mobile=await p.evaluate(()=>document.querySelectorAll('.letter.correct').length);await c.close();}
await b.close();console.log(JSON.stringify(R,null,1));})();
