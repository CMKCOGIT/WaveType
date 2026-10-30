// INP aproximado: Event Timing API com teclas reais (interactionId), p98 das interações.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for(const base of ['http://localhost:4174','http://localhost:4173']){const res=[];for(let k=0;k<8;k++){const p=await b.newPage({viewport:{width:1280,height:900}});
await p.route('https://wt.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await p.addInitScript(()=>{window.__ev={};new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(e.interactionId){window.__ev[e.interactionId]=Math.max(window.__ev[e.interactionId]||0,e.duration)}})).observe({type:'event',buffered:true,durationThreshold:16});});
await p.goto(base+'/index.html',{waitUntil:'networkidle'});await p.waitForTimeout(600);await p.click('#typing-stage');
const t=await p.evaluate(()=>[...document.querySelectorAll('#words-wrapper .word')].slice(0,12).map(w=>w.dataset.text).join(' ').slice(0,60));
await p.keyboard.type(t,{delay:45});await p.click('.preview-tab-btn >> nth=1').catch(()=>{});await p.waitForTimeout(500);
res.push(await p.evaluate(()=>{const v=Object.values(window.__ev).sort((a,b)=>a-b);return {n:v.length,inp:v.length?v[Math.min(v.length-1,Math.floor(v.length*0.98))]:'<16'}}));await p.close();}
console.log(base.slice(-4),JSON.stringify(res));}
await b.close();})();
