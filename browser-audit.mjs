import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
const tests=[],errors=[];let browser,server;
const root=path.resolve('public');
const check=(name,pass,detail)=>{tests.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});console.log('BROWSER',pass?'PASS':'FAIL',name);};
try{
 server=createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/')name='/index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw new Error('Invalid path');const bytes=await readFile(file);const ext=path.extname(file);res.writeHead(200,{'content-type':ext==='.html'?'text/html; charset=utf-8':ext==='.js'?'text/javascript; charset=utf-8':ext==='.json'?'application/json':'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await playwright.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load',timeout:45000});
 await page.waitForFunction(()=>typeof state!=='undefined'&&state.records.length>20&&window.OSDFractalLevels&&document.querySelector('#priceChart'),null,{timeout:30000});
 await page.waitForTimeout(2200);
 const original=await page.evaluate(()=>({cursor:state.currentIndex,date:state.selectedDate}));
 const initial=await page.evaluate(()=>({title:document.title,bars:state.records.length,chart:!!document.querySelector('#priceChart'),body:document.body.innerText.length,buttons:[...document.querySelectorAll('button[id]')].map(b=>({id:b.id,text:b.textContent.trim()})),svgRoles:[...document.querySelectorAll('svg[id]')].map(x=>x.id)}));
 check('Original full app loads',initial.chart&&initial.body>2000,{title:initial.title,rows:initial.bars});
 check('Fractal level control installed',await page.locator('#fractalLevelsToggle').count()===1);
 check('24 deterministic engine tests',await page.evaluate(()=>OSDFractalEngine.selfTest().pass));
 const sequence=await page.evaluate(()=>{
  const cases=[];const limit=Math.min(state.records.length-2,Math.max(state.currentIndex+300,600));
  for(const side of ['high','low'])for(const outcome of ['confirmed','invalidated']){
   let selected=null;
   for(let cursor=5;cursor<limit;cursor++){
    const a=OSDFractalEngine.compute(state.records,cursor)[side];if(!a.candidate)continue;
    const b=OSDFractalEngine.compute(state.records,cursor+1)[side];const good=b.confirmed?.origin===a.candidate.origin;
    if(good!==(outcome==='confirmed'))continue;
    state.currentIndex=cursor;renderAll(false);
    const lines=[...document.querySelectorAll('[data-role="fractal-opposite-edge-line"]')];
    const line=lines.find(x=>x.dataset.side===side&&x.dataset.state==='developing'&&+x.dataset.origin===a.candidate.origin);
    const symbol=document.querySelector(`[data-role="potential-fractal-${side}"]`);
    const group=line?.parentElement;
    const sync=!!symbol&&!!group&&getComputedStyle(symbol).animationName===getComputedStyle(group).animationName&&getComputedStyle(symbol).animationDuration===getComputedStyle(group).animationDuration&&getComputedStyle(group).animationName!=='none';
    const bars=[...document.querySelectorAll('#priceChart [data-role="price-bar"]')];const first=cursor-bars.length+1;
    const points=bars.map((el,k)=>({p:state.records[first+k].high,y:+el.getAttribute('y')}));
    points.sort((x,y)=>x.p-y.p);const p1=points[0],p2=points.at(-1);const slope=(p2.y-p1.y)/(p2.p-p1.p);
    const expected=p1.y+(a.candidate.price-p1.p)*slope;
    const aligned=!!line&&Math.abs(+line.getAttribute('y1')-expected)<.05&&line.getAttribute('y1')===line.getAttribute('y2');
    const oldRetained=!a.confirmed||lines.some(x=>x.dataset.side===side&&x.dataset.state==='confirmed'&&+x.dataset.origin===a.confirmed.origin);
    state.currentIndex=cursor+1;renderAll(false);
    const after=[...document.querySelectorAll('[data-role="fractal-opposite-edge-line"]')].filter(x=>x.dataset.side===side&&+x.dataset.origin===a.candidate.origin);
    const resolution=good?after.some(x=>x.dataset.state==='confirmed'&&!x.parentElement.classList.contains('osd-fractal-provisional')):after.length===0;
    state.currentIndex=cursor;renderAll(false);
    const rewind=!!document.querySelector(`[data-role="fractal-opposite-edge-line"][data-side="${side}"][data-state="developing"][data-origin="${a.candidate.origin}"]`);
    selected={side,outcome,cursor,price:a.candidate.price,visible:!!line,synchronizedBlink:sync,aligned,priorConfirmedRetained:oldRetained,resolution,rewind};break;
   }
   cases.push(selected||{side,outcome,missing:true});
  }
  return cases;
 });
 for(const c of sequence){const name=`${c.side} candidate → ${c.outcome}`;check(name,!c.missing&&c.visible&&c.synchronizedBlink&&c.aligned&&c.priorConfirmedRetained&&c.resolution&&c.rewind,c);}
 const nav=await page.evaluate(()=>{
  const find=re=>[...document.querySelectorAll('button[id]')].find(b=>!b.disabled&&re.test(b.id));
  const next=find(/^(nextBtn|nextBarBtn)$/i)||find(/next.*(?:bar|btn)/i);const before=state.currentIndex;
  next?.click();const after=state.currentIndex;
  const back=find(/^(prevBtn|backBtn|previousBtn|prevBarBtn)$/i)||find(/(?:prev|back).*(?:bar|btn)/i);back?.click();
  return {nextId:next?.id,backId:back?.id,before,after,returned:state.currentIndex};
 });check('Native Next and Previous navigation',nav.after===nav.before+1&&nav.returned===nav.before,nav);
 await page.evaluate(()=>document.getElementById('fractalLevelsToggle').click());
 check('Level hide removes all level lines',await page.locator('[data-role="fractal-opposite-edge-line"]').count()===0);
 await page.evaluate(()=>document.getElementById('fractalLevelsToggle').click());
 check('Level show restores current causal levels',await page.locator('[data-role="fractal-opposite-edge-line"]').count()>0);
 const mfe=await page.evaluate(()=>{const saved={trade:state.trade,cursor:state.currentIndex};const i=Math.max(3,state.currentIndex);const r=state.records[i],n=state.records[i+1];const results=[];try{for(const side of ['LONG','SHORT']){state.trade={entryIndex:i,entryPrice:r.close,side,riskPoints:10};state.currentIndex=i;const a=computeExcursion();state.currentIndex=i+1;const b=computeExcursion();const ef=side==='LONG'?Math.max(0,n.high-r.close):Math.max(0,r.close-n.low),ea=side==='LONG'?Math.min(0,n.low-r.close):Math.min(0,r.close-n.high);results.push({side,zeroAtEntry:a.mfe===0&&a.mae===0,postEntryMatches:Math.abs(b.mfe-ef)<1e-7&&Math.abs(b.mae-ea)<1e-7});}}finally{state.trade=saved.trade;state.currentIndex=saved.cursor;renderAll(false);}return results;});
 check('Original MFE/MAE excludes pre-entry candle extremes',mfe.every(x=>x.zeroAtEntry&&x.postEntryMatches),mfe);
 const control=await page.evaluate(()=>({entry:!!document.getElementById('entryBtn'),hypothesis:!!document.getElementById('observationNote'),reflection:!!document.getElementById('postStudyReflectionModal'),pivots:!!document.getElementById('pivotToggle')||!!document.getElementById('dailyPivotToggle')||typeof renderDailyPivotSvg==='function',fib:!!document.getElementById('currentFibToggle'),log:!!document.getElementById('logBody'),import:!!document.querySelector('input[type=file]'),export:typeof exportLog==='function',selfTest:document.getElementById('selfTest')?.textContent}));
 check('Original research workflow controls retained',['entry','hypothesis','reflection','pivots','fib','log','import','export'].every(k=>control[k]),control);
 await mkdir('public/audit',{recursive:true});
 await page.screenshot({path:'public/audit/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);await page.evaluate(()=>renderAll(false));
 const mobile=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,chart:!!document.querySelector('#priceChart'),lines:document.querySelectorAll('[data-role="fractal-opposite-edge-line"]').length}));
 check('Mobile chart renders without page-width overflow',mobile.chart&&mobile.scrollWidth<=mobile.width+2,mobile);
 await page.screenshot({path:'public/audit/mobile.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});const reduced=await page.evaluate(()=>[...document.querySelectorAll('.osd-fractal-provisional')].every(x=>getComputedStyle(x).animationName==='none'));check('Reduced-motion preference respected',reduced);
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(o=>{state.currentIndex=o.cursor;state.selectedDate=o.date;renderAll(false);},original);
 await writeFile('public/audit/controls.json',JSON.stringify(initial.buttons,null,2));
 check('No JavaScript page errors',errors.length===0,errors);
}catch(e){check('Browser audit completed',false,String(e.stack||e));}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
const report={passed:tests.filter(t=>t.pass).length,total:tests.length,pass:tests.every(t=>t.pass),tests,errors};
await writeFile('public/browser-audit.json',JSON.stringify(report,null,2));
console.log('BROWSER AUDIT:',report.passed+'/'+report.total);
