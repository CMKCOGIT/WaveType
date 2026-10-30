const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const out=[];
for(let k=0;k<5;k++){const p=await b.newPage({viewport:{width:1280,height:900}});
await p.route('https://wt.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await p.goto(process.argv[2]+'/index.html',{waitUntil:'networkidle'});await p.waitForTimeout(800);await p.locator('#typing-input').focus();
out.push(await p.evaluate(async()=>{const i=document.getElementById('typing-input');const t=[...document.querySelectorAll('#words-wrapper .word')].slice(0,14).map(w=>w.dataset.text).join(' ').slice(0,70);const h=[];
for(const c of t){const t0=performance.now();i.dispatchEvent(new KeyboardEvent('keydown',{key:c,bubbles:true,cancelable:true}));h.push(performance.now()-t0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
h.sort((a,b)=>a-b);return [h[h.length>>1],h[Math.floor(h.length*.95)]];}));await p.close();}
console.log(process.argv[2],JSON.stringify(out.map(x=>x.map(v=>+v.toFixed(2)))));await b.close();})();
