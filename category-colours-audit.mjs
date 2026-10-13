import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import path from 'node:path';
import chromium from '@sparticuz/chromium';
import {chromium as pw} from 'playwright-core';
const VERSION='3.6.3',remote=process.env.OSD_CATEGORY_AUDIT_URL,tests=[],errors=[];
let browser,server;
const check=(name,pass,detail)=>{tests.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});console.log('CATEGORY',pass?'PASS':'FAIL',name);if(!pass)console.log(JSON.stringify(detail));};
const study=()=>{
 const i=state.records.findIndex((r,j)=>j>400&&r.hour===5);
 state.currentIndex=i;state.contextBars=24;state.selectedDate=state.records[i].dateKey;state.replayStartIndex=state.dateFirst.get(state.selectedDate)||0;
 state.currentFibOn=true;state.fibHistoryOn=true;state.fibHistoryDepth=99;state.pivotOn=true;state.pivotHistoryOn=true;state.pivotHistoryDepth=99;state.pivotLevelSet='P_R1S1_R2S2';state.trade=null;
 OSDFractalLevels.setEnabled(true);OSDStructureView.setCandles(true);OSDStructureView.setHistory(true);renderAll(false);return i;
};
const geometry=()=>[...document.querySelectorAll('#priceChart *')].filter(e=>['line','path','rect','text','circle','polygon'].includes(e.tagName.toLowerCase())).map(e=>({tag:e.tagName,role:e.dataset.role||'',coordinates:['x','y','x1','x2','y1','y2','cx','cy','r','width','height','d','points','transform','viewBox','data-price','data-origin','data-until'].map(k=>e.getAttribute(k))}));
const inventory=()=>{
 const svg=document.getElementById('priceChart');
 return [...svg.querySelectorAll('[data-osd-category]')].map(e=>({tag:e.tagName.toLowerCase(),role:e.dataset.role,category:e.dataset.osdCategory,phase:e.dataset.osdPhase,state:e.dataset.state,side:e.dataset.side,stroke:e.getAttribute('stroke'),fill:e.getAttribute('fill'),opacity:e.getAttribute('opacity'),width:e.getAttribute('stroke-width'),dash:e.getAttribute('stroke-dasharray'),text:e.tagName==='text'?e.textContent:''}));
};
async function onboard(page){await page.waitForFunction(()=>typeof state!=='undefined'&&state.records.length>450&&window.OSDStructureView);await page.waitForTimeout(2300);if(await page.locator('#welcomeModal.open').isVisible()){await page.locator('#dontShowWelcome').check();await page.locator('#welcomeStartBtn').click();await page.locator('#welcomeModal').waitFor({state:'hidden'});}}
async function capture(page,selector,file){for(let n=0;n<3;n++){try{await page.waitForTimeout(400);return await page.locator(selector).screenshot({path:file});}catch(e){if(n===2)throw e;}}}
try{
 const root=path.resolve('public');
 server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;const f=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!f.startsWith(root+path.sep))throw Error('Invalid file');const bytes=await readFile(f);res.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const local=`http://127.0.0.1:${server.address().port}`;
 browser=await pw.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(remote||local,{waitUntil:'load',timeout:60000});
 const bytes=await response.body(),expected=JSON.parse(await readFile('public/build-report.json')).finalSHA256;
 check('Served HTML is the exact final category-colour build',response.status()===200&&createHash('sha256').update(bytes).digest('hex')===expected);
 await onboard(page);await page.evaluate(study);
 const inv=await page.evaluate(inventory),palette=await page.evaluate(()=>OSDCategoryColours.palette);
 check('Four category colours are distinct',new Set(Object.values(palette).map(x=>x.colour)).size===4,palette);
 check('Release badge and title identify 3.6.3',await page.evaluate(()=>document.getElementById('osdReleaseBadge').textContent==='v3.6.3'&&document.title.includes('3.6.3')));
 for(const [cat,roles] of Object.entries({previousDay:['pdh-line','pdl-line'],fibonacci:['fib-current-upper','fib-current-lower','fib-history-upper','fib-history-lower'],pivot:['daily-pivot-p','daily-pivot-r1','daily-pivot-s1','daily-pivot-r2','daily-pivot-s2']})){
  const elements=inv.filter(x=>x.category===cat&&roles.includes(x.role));
  check(`${cat}: all expected line types exist and share one colour`,roles.every(r=>elements.some(e=>e.role===r))&&elements.every(e=>e.stroke===palette[cat].colour),elements);
  const labels=inv.filter(x=>x.category===cat&&x.tag==='text');
  check(`${cat}: labels match their category`,labels.length>0&&labels.every(x=>x.fill===palette[cat].colour),labels.map(x=>({text:x.text,fill:x.fill})));
  const boxes=inv.filter(x=>x.category===cat&&x.tag==='rect'&&!/^(fib-hit-|pivot-touch-)/.test(x.role||''));
  check(`${cat}: label background stays neutral and border matches`,boxes.length>0&&boxes.every(x=>x.fill==='#f7f6f0'&&x.stroke===palette[cat].colour));
  const current=elements.filter(x=>x.phase==='current'),history=elements.filter(x=>x.phase==='history');
  check(`${cat}: current lines solid; histories thinner and faded`,current.length>0&&history.length>0&&current.every(x=>x.dash===null&&+x.opacity===1)&&history.every(x=>+x.opacity===.42&&+x.width===1.05));
 }
 const fractals=inv.filter(x=>x.category==='fractal');
 check('HF LOW and LF HIGH current lines share the same colour', ['high','low'].every(side=>fractals.some(x=>x.role==='fractal-opposite-edge-line'&&x.side===side))&&fractals.every(x=>x.stroke===palette.fractal.colour));
 check('Both fractal histories retain the category hue at 42 percent opacity', ['high','low'].every(side=>fractals.some(x=>x.role==='fractal-history-line'&&x.side===side))&&fractals.filter(x=>x.role==='fractal-history-line').every(x=>x.stroke===palette.fractal.colour&&+x.opacity===.42&&+x.width===1.05));
 const marker=await page.evaluate(()=>{const p=OSDCategoryColours.palette;return [...document.querySelectorAll('#priceChart [data-role="fractal-high"],#priceChart [data-role="fractal-low"]')].map(e=>({role:e.dataset.role,fill:e.getAttribute('fill'),correct:e.getAttribute('fill')===p.fractal.colour}));});
 check('High and low confirmed fractal symbols match the category',marker.length>0&&marker.every(x=>x.correct));
 for(const [cat,re] of [['fibonacci',/^fib-hit-/],['pivot',/^pivot-touch-/]]){const found=inv.filter(x=>re.test(x.role||''));check(`${cat}: touch markers share category colour`,found.length>0&&found.every(x=>x.fill===palette[cat].colour));}
 check('Legend has exactly four named category keys and no old side-colour key',await page.evaluate(()=>document.querySelectorAll('#lineCategoryLegend .category-key').length===4&&!document.getElementById('fractalColourLegend')));
 check('Readouts, existing legend and help use the same category mapping',await page.evaluate(()=>{
 const c=id=>getComputedStyle(document.getElementById(id)).color;
 return c('detailPDH')===c('detailPDL')&&c('fibUpper')===c('fibLower')&&c('pivotPValue')===c('pivotR1Value')&&c('pivotR1Value')===c('pivotS1Value')&&[...document.querySelectorAll('#fractalLevelReadout span')].every(e=>e.style.color==='rgb(121, 81, 138)')&&!document.body.textContent.includes('blue identifies PDH and red identifies PDL')&&HELP_CONTENT.chart.body.includes('Colour identifies a category');
 }));
 const before=await page.evaluate(geometry);
 const baseline=await context.newPage();await baseline.goto(local+'/category-baseline.html',{waitUntil:'load'});await onboard(baseline);await baseline.evaluate(study);
 const prior=await baseline.evaluate(geometry);
 check('Every SVG price coordinate and historical endpoint matches the baseline',JSON.stringify(before)===JSON.stringify(prior),{currentNodes:before.length,baselineNodes:prior.length});
 const bars=p=>p.evaluate(()=>[...document.querySelectorAll('#priceChart [data-role="price-bar"],#priceChart [data-role="close-tick"]')].map(e=>[e.getAttribute('fill'),e.getAttribute('stroke')]));
 check('Price bar styling is unchanged',JSON.stringify(await bars(page))===JSON.stringify(await bars(baseline)));
 await page.locator('#chartControlsLink').click();await page.locator('#chartCandlesToggle').click();
 check('Hide candles removes only price while category lines stay visible',await page.evaluate(()=>!OSDStructureView.isCandlesOn()&&[...document.querySelectorAll('#priceChart [data-role="price-bar"],#priceChart [data-role="close-tick"]')].every(e=>getComputedStyle(e).visibility==='hidden')&&[...document.querySelectorAll('#priceChart line[data-osd-category]')].length>10));
 check('Hiding candles leaves all coordinates intact',JSON.stringify(before)===JSON.stringify(await page.evaluate(geometry)));
 await page.locator('#chartCandlesToggle').click();
 check('Show candles restores price without changing the palette',await page.evaluate(()=>OSDStructureView.isCandlesOn()&&document.querySelector('[data-role="pdl-line"]').getAttribute('stroke')===OSDCategoryColours.palette.previousDay.colour));
 for(const side of ['high','low']){
  const result=await page.evaluate(side=>{
   const original=state.currentIndex;let evidence=null;
   for(let end=100;end<1000;end++){
    const candidate=OSDFractalEngine.compute(state.records,end)[side].candidate;if(!candidate)continue;
    state.currentIndex=end;renderAll(false);const select=`[data-role="fractal-opposite-edge-line"][data-state="developing"][data-side="${side}"]`;const line=document.querySelector(select);if(!line)continue;
    const initial=line.getAttribute('stroke-dasharray');for(let n=0;n<4;n++)OSDCategoryColours.sync();
    const g=document.querySelector(`[data-role="potential-fractal-${side}"]`),consistent=line.getAttribute('stroke')===OSDCategoryColours.palette.fractal.colour;
    const blinking=getComputedStyle(line.parentElement).animationName!=='none'&&!!g&&getComputedStyle(g).animationName!=='none';
    const afterSync=line.getAttribute('stroke-dasharray');state.currentIndex=end+1;renderAll(false);
    const expected=OSDFractalEngine.compute(state.records,end+1)[side].confirmed?.origin===candidate.origin;
    const resolved=[...document.querySelectorAll('[data-role="fractal-opposite-edge-line"]')].filter(e=>e.dataset.side===side&&+e.dataset.origin===candidate.origin);
    const resolution=expected?resolved.some(e=>e.dataset.state==='confirmed'&&!e.hasAttribute('stroke-dasharray')):resolved.length===0;
    state.currentIndex=end;renderAll(false);const rewind=!!document.querySelector(select)?.getAttribute('stroke-dasharray');
    evidence={consistent,blinking,dashed:!!initial&&initial===afterSync,resolution,rewind};break;
   }
   state.currentIndex=original;renderAll(false);return evidence;
  },side);
  check(`${side}: category hue preserves dashed blinking candidates, resolution and rewind`,result&&Object.values(result).every(Boolean),result);
 }
 await page.evaluate(study);
 const toggles=[['currentFibToggle','fib-current-upper'],['fibHistoryToggle','fib-history-upper'],['dailyPivotToggle','daily-pivot-p'],['chartFractalLevelsToggle','fractal-opposite-edge-line']];
 for(const [id,role] of toggles){
  const count=await page.locator(`[data-role="${role}"]`).count();await page.locator('#'+id).click();
  // Pivot history can still show older days, so compare current-day tagged lines.
  const off=await page.evaluate(({role})=>role.startsWith('daily-pivot')?document.querySelectorAll(`[data-role="${role}"][data-osd-phase="current"]`).length===0:document.querySelectorAll(`[data-role="${role}"]`).length===0,{role});
  await page.locator('#'+id).click();check(`${id}: off/on works without losing category styling`,count>0&&off&&(await page.locator(`[data-role="${role}"]`).count())>0);
 }
 const values=Object.values(palette).map(p=>p.colour);
 const lum=hex=>{const v=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
 const contrasts=Object.fromEntries(Object.entries(palette).map(([k,v])=>[k,(lum('#f7f6f0')+.05)/(lum(v.colour)+.05)]));check('Category text colours exceed 4.5:1 on chart paper (not faded histories)',Object.values(contrasts).every(x=>x>=4.5),contrasts);
 await mkdir('public/'+(remote?'post-deploy':'audit'),{recursive:true});
 await page.evaluate(()=>OSDStructureView.setCandles(false));
 const svg=await page.locator('#priceChart').evaluate(e=>new XMLSerializer().serializeToString(e));
 check('SVG export embeds all four category colours and hidden-candle state',values.every(c=>svg.includes(c))&&svg.includes('visibility: hidden')&&svg.includes('fractal-history-line'));
 for(const width of [320,390,430,700,768,1024,1280,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(400);await page.evaluate(()=>renderAll(false));
  await page.locator('#chartControlsLink').click();await page.waitForTimeout(250);
  const fit=await page.evaluate(()=>{
   const l=document.getElementById('lineCategoryLegend'),r=l.getBoundingClientRect();const keys=[...l.querySelectorAll('.category-key')].map(e=>e.getBoundingClientRect());const h=document.getElementById('chartCandlesToggle'),b=h.getBoundingClientRect();
   return {width:innerWidth,noOverflow:document.documentElement.scrollWidth<=innerWidth+1,contained:keys.every(k=>k.left>=r.left&&k.right<=r.right+1),noOverlap:keys.every((a,i)=>keys.slice(i+1).every(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1)),hideVisible:b.top>=0&&b.bottom<=innerHeight&&h.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};
  });check(`Category legend and Hide candles fit at ${width}px`,fit.noOverflow&&fit.contained&&fit.noOverlap&&fit.hideVisible,fit);
  if(width===390||width===1440){const dir=remote?'post-deploy':'audit';await capture(page,'#lineCategoryLegend',`public/${dir}/category-legend-${width}.png`);await capture(page,'#priceChart',`public/${dir}/category-chart-${width}.png`);await capture(page,'#replayControls',`public/${dir}/category-toolbar-${width}.png`);}
 }
 await page.setViewportSize({width:640,height:1000});await page.evaluate(()=>document.documentElement.style.zoom='2');await page.waitForTimeout(400);await page.evaluate(()=>renderAll(false));
 check('Category legend fits at 200 percent enlargement',await page.evaluate(()=>{const r=document.getElementById('lineCategoryLegend').getBoundingClientRect();return [...document.querySelectorAll('#lineCategoryLegend .category-key')].every(e=>e.getBoundingClientRect().right<=r.right+1)&&document.documentElement.scrollWidth<=innerWidth+1;}));
 await page.evaluate(()=>document.documentElement.style.zoom='');await page.setViewportSize({width:1440,height:1000});
 await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.OSDCategoryColours&&document.querySelector('[data-role="price-bar"]'));
 check('Reload preserves hidden candles and category colours',await page.evaluate(()=>!OSDStructureView.isCandlesOn()&&document.querySelector('[data-role="pdl-line"]')?.getAttribute('stroke')===OSDCategoryColours.palette.previousDay.colour));
 const engines=await page.evaluate(()=>[OSDFractalEngine.selfTest(),OSDStructureEngine.selfTest()]);check('Both causal engines still pass inside final app',engines.every(e=>e.pass),engines.map(e=>({passed:e.passed,total:e.total})));
 check('No JavaScript page errors',errors.length===0,errors);
}catch(e){check('Category browser audit completed',false,String(e.stack||e));}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
const report={version:VERSION,scope:remote||'local-final-build',passed:tests.filter(t=>t.pass).length,total:tests.length,pass:tests.every(t=>t.pass),tests,errors};
await writeFile('public/'+(remote?'post-deployment-categories':'category-colours-audit')+'.json',JSON.stringify(report,null,2));
console.log('CATEGORY AUDIT',report.passed+'/'+report.total);if(!report.pass)throw Error('Category colour audit failed.');
