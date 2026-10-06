import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import path from 'node:path';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
const remote=process.env.OSD_AUDIT_URL,folder=remote?'post-deploy':'audit';
const tests=[],errors=[];let browser,server;
const check=(name,pass,detail)=>{tests.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});console.log('FINAL',pass?'PASS':'FAIL',name);if(!pass)console.log(JSON.stringify(detail));};
const root=path.resolve('public');
try{
 await mkdir('public/'+folder,{recursive:true});
 let url=remote;
 if(!url){server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;const f=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!f.startsWith(root+path.sep))throw Error('Invalid path');const data=await readFile(f);res.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/`;}
 browser=await playwright.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e.message||e)));
 const response=await page.goto(url,{waitUntil:'load',timeout:60000});
 const servedHTML=await response.text();
 check('Page serves the final Hide candles control in its HTML',response.status()===200&&servedHTML.includes('id="chartCandlesToggle"'));
 const expected=JSON.parse(await readFile('public/build-report.json','utf8')).finalSHA256;
 check('Served application matches audited build SHA256',createHash('sha256').update(servedHTML).digest('hex')===expected,{expected,actual:createHash('sha256').update(servedHTML).digest('hex'),origin:new URL(page.url()).origin});
 await page.waitForFunction(()=>window.OSDVisibleChartControls?.version==='3.6.1'&&typeof state!=='undefined'&&state.records.length>20&&!!document.querySelector('#priceChart'),null,{timeout:30000});
 await page.waitForTimeout(2200);
 if(await page.locator('#welcomeModal.open').isVisible()){await page.locator('#dontShowWelcome').check();await page.locator('#welcomeStartBtn').click();await page.locator('#welcomeModal').waitFor({state:'hidden'});}
 check('Version 3.6.1 is visibly identifiable',await page.locator('#osdReleaseBadge').innerText()==='v3.6.1');
 const controls=await page.evaluate(()=>({hide:document.querySelectorAll('#chartCandlesToggle').length,levels:document.querySelectorAll('#chartFractalLevelsToggle').length,history:document.querySelectorAll('#chartFractalHistoryToggle').length,adjacent:document.getElementById('nextBtn').nextElementSibling.id==='chartCandlesToggle',sameToolbar:['chartCandlesToggle','chartFractalLevelsToggle','chartFractalHistoryToggle'].every(id=>document.getElementById('replayControls').contains(document.getElementById(id)))}));
 check('Hide candles is beside Next and all layer controls share one toolbar',Object.values(controls).every(x=>x===true||x===1),controls);
 await page.locator('#chartControlsLink').click();await page.waitForFunction(()=>document.activeElement?.id==='chartCandlesToggle'&&document.getElementById('chartCandlesToggle').getBoundingClientRect().bottom<=innerHeight);
 await page.waitForTimeout(200);
 check('Header shortcut brings the hide button into view',await page.locator('#chartCandlesToggle').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.activeElement===el;}));
 await page.evaluate(()=>{state.currentIndex=400;state.replayStartIndex=370;state.selectedDate=state.records[400].dateKey;state.contextBars=24;OSDStructureView.setCandles(true);OSDFractalLevels.setEnabled(true);OSDStructureView.setHistory(true);renderAll(false);});
 const read=()=>{const chart=document.getElementById('priceChart'),price=[...chart.querySelectorAll('[data-role="price-bar"],[data-role="close-tick"]')];return {cursor:state.currentIndex,price:price.length,visible:price.filter(e=>getComputedStyle(e).visibility!=='hidden').length,viewBox:chart.getAttribute('viewBox'),lines:[...chart.querySelectorAll('line:not([data-role="close-tick"]),[data-role="fractal-high"],[data-role="fractal-low"]')].map(e=>e.outerHTML).join(''),history:chart.querySelectorAll('[data-role="fractal-history-line"]').length,historySides:[...new Set([...chart.querySelectorAll('[data-role="fractal-history-line"]')].map(e=>e.dataset.side))],excursion:JSON.stringify(computeExcursion())};};
 const before=await page.evaluate(read);
 await page.locator('#chartCandlesToggle').click();
 const hidden=await page.evaluate(read);
 check('Real click hides every H1 price bar and close tick',hidden.price>0&&hidden.visible===0,{priceNodes:hidden.price,visible:hidden.visible});
 check('Hide changes to Show candles and agrees with the saved state',await page.locator('#chartCandlesToggle').textContent()==='Show candles'&&await page.evaluate(()=>!OSDStructureView.isCandlesOn()&&document.querySelector('#candlesToggle .control-value').textContent==='Off'));
 check('Hiding candles preserves scale, indicator geometry, cursor and MFE/MAE',before.viewBox===hidden.viewBox&&before.lines===hidden.lines&&before.cursor===hidden.cursor&&before.excursion===hidden.excursion);
 check('Historical HF LOW and LF HIGH segments remain visible',hidden.history>0&&hidden.historySides.includes('high')&&hidden.historySides.includes('low'),{segments:hidden.history,sides:hidden.historySides});
 await page.locator('#nextBtn').click();
 check('Next advances one bar while candles stay hidden',await page.evaluate(()=>state.currentIndex===401&&[...document.querySelectorAll('#priceChart [data-role="price-bar"]')].every(e=>getComputedStyle(e).visibility==='hidden')));
 await page.locator('#prevBtn').click();
 check('Previous restores historical line geometry',await page.evaluate(read).then(x=>x.lines===hidden.lines&&x.cursor===hidden.cursor));
 await page.locator('#chartCandlesToggle').click();
 check('Show candles restores all original price glyphs',await page.evaluate(read).then(x=>x.visible===x.price&&x.price===before.price));
 await page.locator('#chartFractalHistoryToggle').click();
 check('History OFF removes only historical segments',await page.evaluate(()=>document.querySelectorAll('[data-role="fractal-history-line"]').length===0&&document.querySelectorAll('[data-role="fractal-opposite-edge-line"]').length>0&&!OSDStructureView.isHistoryOn()));
 await page.locator('#chartFractalHistoryToggle').click();
 check('History ON restores historical segments',await page.locator('[data-role="fractal-history-line"]').count()>0);
 await page.locator('#chartFractalLevelsToggle').click();
 check('Levels OFF hides current and history lines without changing the history preference',await page.evaluate(()=>document.querySelectorAll('[data-role="fractal-history-line"],[data-role="fractal-opposite-edge-line"]').length===0&&OSDStructureView.isHistoryOn()&&document.getElementById('chartFractalHistoryToggle').disabled));
 await page.locator('#chartFractalLevelsToggle').click();
 check('Levels ON restores current and history lines',await page.locator('[data-role="fractal-history-line"]').count()>0&&await page.locator('[data-role="fractal-opposite-edge-line"]').count()>0);
 // Original settings are retained as synchronized secondary controls.
 await page.locator('#candlesToggle').click();
 check('Original candle setting synchronizes the prominent control',await page.locator('#chartCandlesToggle').textContent()==='Show candles');
 await page.locator('#chartControlsLink').click();await page.waitForFunction(()=>document.activeElement?.id==='chartCandlesToggle'&&document.getElementById('chartCandlesToggle').getBoundingClientRect().bottom<=innerHeight);
 const index=await page.evaluate(()=>state.currentIndex);
 await page.keyboard.press('Space');
 check('Keyboard Space toggles once without advancing replay',await page.evaluate(i=>OSDStructureView.isCandlesOn()&&state.currentIndex===i,index));
 await page.keyboard.press('Enter');
 check('Keyboard Enter toggles once without advancing replay',await page.evaluate(i=>!OSDStructureView.isCandlesOn()&&state.currentIndex===i,index));
 check('Keyboard focus remains visible',await page.locator('#chartCandlesToggle').evaluate(el=>el.matches(':focus-visible')&&getComputedStyle(el).outlineStyle!=='none'));
 await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.OSDVisibleChartControls&&typeof state!=='undefined'&&state.records.length>20);
 check('Hidden candles and history preferences survive a fresh load',await page.evaluate(()=>!OSDStructureView.isCandlesOn()&&OSDStructureView.isHistoryOn()&&document.getElementById('chartCandlesToggle').textContent==='Show candles'));
 await page.evaluate(()=>{state.currentIndex=400;state.replayStartIndex=370;OSDStructureView.setCandles(true);renderAll(false);});
 const widths=[320,390,430,700,768,1024,1280,1440,1920];
 for(const width of widths){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);await page.locator('#chartControlsLink').click();await page.waitForFunction(()=>document.activeElement?.id==='chartCandlesToggle'&&document.getElementById('chartCandlesToggle').getBoundingClientRect().bottom<=innerHeight);await page.waitForTimeout(150);
  const measured=await page.evaluate(()=>{const ids=['rewindBtn','prevBtn','nextBtn','chartCandlesToggle','chartFractalLevelsToggle','chartFractalHistoryToggle'],toolbar=document.getElementById('replayControls').getBoundingClientRect();const boxes=ids.map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect(),style=getComputedStyle(el),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,font:style.fontSize,display:style.display,visibility:style.visibility,text:el.textContent,hit:!!hit&&(hit===el||el.contains(hit))};});const contains=boxes.every(r=>r.left>=toolbar.left-1&&r.right<=toolbar.right+1&&r.top>=toolbar.top-1&&r.bottom<=toolbar.bottom+1);const overlap=boxes.some((a,i)=>boxes.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));return {width:innerWidth,scroll:document.documentElement.scrollWidth,boxes,contains,overlap};});
  check(`Visible, unobscured, non-overlapping controls at ${width}px`,measured.contains&&!measured.overlap&&measured.scroll<=width+2&&measured.boxes.every(b=>b.hit&&b.display!=='none'&&b.visibility!=='hidden'&&parseFloat(b.font)>=8),measured);
  if(width<=700)check(`Mobile targets are at least 44px high at ${width}px`,measured.boxes.every(b=>b.height>=44),measured.boxes.map(x=>({id:x.id,height:x.height})));
  if(width===390||width===1440){await page.mouse.move(0,0);await page.locator('#chartCandlesToggle').evaluate(e=>e.blur());await page.locator('#replayControls').screenshot({path:`public/${folder}/visible-toolbar-${width}.png`});}
 }
 await page.setViewportSize({width:1440,height:1000});await page.locator('#chartControlsLink').click();await page.waitForFunction(()=>document.activeElement?.id==='chartCandlesToggle'&&document.getElementById('chartCandlesToggle').getBoundingClientRect().bottom<=innerHeight);
 for(const mode of ['H1','SPLIT','D1']){
  await page.locator(`[data-daily-mode="${mode}"]`).click();
  check(`Hide control remains present in ${mode} mode`,await page.locator('#chartCandlesToggle').isVisible());
 }
 await page.locator('[data-daily-mode="H1"]').click();
 await page.locator('#chartCandlesToggle').click();
 await page.evaluate(()=>{state.currentIndex=400;state.replayStartIndex=370;renderAll(false);});
 await page.locator('#priceChart').scrollIntoViewIfNeeded();await page.waitForTimeout(250);
 for(let attempt=0;attempt<3;attempt++){try{await page.locator('#priceChart').screenshot({path:`public/${folder}/structure-only.png`});break;}catch(e){if(attempt===2)throw e;await page.waitForTimeout(300);}}
 await page.setViewportSize({width:640,height:1000});await page.evaluate(()=>document.documentElement.style.zoom='2');await page.locator('#chartControlsLink').click();await page.waitForFunction(()=>document.activeElement?.id==='chartCandlesToggle'&&document.getElementById('chartCandlesToggle').getBoundingClientRect().bottom<=innerHeight);
 check('200 percent enlargement retains readable controls without horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2&&['chartCandlesToggle','chartFractalLevelsToggle','chartFractalHistoryToggle'].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return r.width>100&&r.left>=0&&r.right<=innerWidth;})));
 await page.evaluate(()=>document.documentElement.style.zoom='');
 const unit=await page.evaluate(()=>({fractal:OSDFractalEngine.selfTest(),history:OSDStructureEngine.selfTest()}));
 check('Both causal engines pass inside the served app',unit.fractal.pass&&unit.history.pass,{fractal:unit.fractal.passed,history:unit.history.passed});
 check('No JavaScript page errors during audited interactions',errors.length===0,errors);
}catch(e){check('Final audit completed',false,String(e.stack||e));}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
const report={version:'3.6.1',scope:remote?'live deployment':'final local build',origin:remote?new URL(remote).origin:'localhost',auditedAt:new Date().toISOString(),passed:tests.filter(t=>t.pass).length,total:tests.length,pass:tests.every(t=>t.pass),tests,errors};
await writeFile('public/'+(remote?'post-deploy-audit':'final-ui-audit')+'.json',JSON.stringify(report,null,2));
console.log('FINAL UI AUDIT',report.passed+'/'+report.total,report.scope);
if(!report.pass)throw Error('Final application audit failed.');
