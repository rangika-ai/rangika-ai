import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import path from 'node:path';
import c from '@sparticuz/chromium';
import {chromium} from 'playwright-core';
const VERSION='3.7.0',remote=process.env.OSD_AUDIT_URL,tests=[],errors=[];
const folder=remote?'live-audit':'audit';let browser,server,engines,spaceReduction;
const check=(name,pass,detail)=>{tests.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});console.log(pass?'PASS':'FAIL',name);if(!pass)console.log(JSON.stringify(detail));};
const geometries=()=>[...document.querySelectorAll('#priceChart line,#priceChart rect,#priceChart text,#priceChart path,#priceChart circle,#priceChart polygon')].map(e=>[e.tagName,e.dataset.role||'',...['x','y','x1','y1','x2','y2','cx','cy','r','width','height','d','points','data-price','data-origin','data-until'].map(k=>e.getAttribute(k))]);
const study=(index=440)=>{state.currentIndex=index;state.selectedDate=state.records[index].dateKey;state.replayStartIndex=state.dateFirst.get(state.selectedDate);state.contextBars=24;state.currentFibOn=true;state.fibHistoryOn=true;state.fibHistoryDepth=8;state.pivotOn=true;state.pivotHistoryOn=true;state.pivotHistoryDepth=3;state.pivotLevelSet='P_R1S1_R2S2';state.trade=null;OSDStructureView.setHistory(true);OSDStructureView.setCandles(true);OSDFractalLevels.setEnabled(true);if(window.OSDChartToolbar){for(const x of ['previousDay','pivot','fibonacci'])OSDChartToolbar.setLayer(x,true);}renderAll(false);};
async function boot(page,url){
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>typeof state!=='undefined'&&state.records.length>400&&window.OSDStructureView,{timeout:30000});
 await page.waitForTimeout(2300);
 if(await page.locator('#welcomeModal.open').isVisible()){await page.locator('#dontShowWelcome').check();await page.locator('#welcomeStartBtn').click();}
}
const vis=()=>[...document.querySelectorAll('#priceChart [data-role="price-bar"],#priceChart [data-role="close-tick"]')].every(e=>getComputedStyle(e).visibility==='hidden');
const statePrefs=()=>JSON.stringify({currentFib:state.currentFibOn,fibHistory:state.fibHistoryOn,fibDepth:state.fibHistoryDepth,pivot:state.pivotOn,pivotHistory:state.pivotHistoryOn,pivotDepth:state.pivotHistoryDepth,pivotSet:state.pivotLevelSet});
try{
 await mkdir('public/'+folder,{recursive:true});
 const root=path.resolve('public');
 server=createServer(async(req,res)=>{try{let pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/')pathname='/index.html';if(pathname==='/before.html')pathname='/source/toolbar-baseline-v3.6.3.html';const f=path.resolve(root,'.'+pathname);if(!f.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':'application/octet-stream');res.end(await readFile(f));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const local='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({args:c.args,executablePath:await c.executablePath(),headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage(),before=await context.newPage();
 const url=remote||local;await boot(before,local+'/before.html');await boot(page,url);
 const actual=await page.request.get(url);const expected=JSON.parse(await readFile('public/release.json','utf8')).sha256;
 check('Served full app matches built HTML checksum',actual.ok()&&createHash('sha256').update(await actual.body()).digest('hex')===expected);
 check('Full H1 data and causal engines initialize',await page.evaluate(()=>state.records.length===27276&&!!OSDStructureView&&!!OSDFractalLevels));
 check('New toolbar initializes without duplicate ids',await page.evaluate(()=>!!OSDChartToolbar&&[...document.querySelectorAll('[id]')].map(x=>x.id).every((x,i,a)=>a.indexOf(x)===i)));
 check('Obsolete duplicated control elements are removed',await page.evaluate(()=>!document.querySelector('.forward-value-stack,.osd-structure-controls,#candlesToggle,#chartFractalLevelsToggle,#chartFractalHistoryToggle,#lineCategoryLegend')));
 check('Exactly one candle button and four category switches',await page.evaluate(()=>document.querySelectorAll('#chartCandlesToggle').length===1&&document.querySelectorAll('#replayControls .osd-layer').length===4));
 check('Settings and More are collapsed on first load',await page.evaluate(()=>document.getElementById('chartSettings').hidden&&!document.getElementById('chartMore').open));
 check('Hide candles is immediately beside Next',await page.evaluate(()=>document.getElementById('nextBtn').nextElementSibling.id==='chartCandlesToggle'));
 check('Release badge is in footer, outside chart toolbar',await page.evaluate(()=>!!document.querySelector('.footer #osdReleaseBadge')&&!document.querySelector('#replayControls #osdReleaseBadge')));
 const previousHeight=await before.evaluate(()=>{const a=document.querySelector('.forward-value-stack').getBoundingClientRect(),b=document.getElementById('replayControls').getBoundingClientRect();return b.bottom-a.top;});
 const currentHeight=await page.locator('#replayControls').evaluate(e=>e.getBoundingClientRect().height);
 spaceReduction={viewport:1440,previousHeight,currentHeight,reductionPercent:Math.round((1-currentHeight/previousHeight)*1000)/10};
 check('Default control area is at least 50 percent shorter',spaceReduction.reductionPercent>=50,spaceReduction);
 check('Desktop default has two compact rows',await page.evaluate(()=>{const r=document.querySelector('.osd-replay-row').getBoundingClientRect(),l=document.querySelector('.osd-layer-row').getBoundingClientRect();return r.height<=62&&l.height<=62;}));
 await page.locator('#replayControls').screenshot({path:'public/'+folder+'/toolbar-desktop.png'});
 await before.evaluate(study,440);await page.evaluate(study,440);
 let unchanged=true;for(const i of [440,447,510,1400,2200]){await before.evaluate(study,i);await page.evaluate(study,i);if(JSON.stringify(await before.evaluate(geometries))!==JSON.stringify(await page.evaluate(geometries)))unchanged=false;}
 check('All chart coordinates and historical endpoints match prior release at five cursors',unchanged);
 await page.evaluate(study,440);const geom=JSON.stringify(await page.evaluate(geometries)),idx=await page.evaluate(()=>state.currentIndex);
 const logs=await page.evaluate(()=>JSON.stringify(state.logs));
 await page.locator('#chartCandlesToggle').click();
 check('Hide candles removes all price bars and close ticks',await page.evaluate(vis));
 check('Candle button now reads Show candles',await page.locator('#chartCandlesToggle').textContent()==='Show candles');
 check('Hiding candles preserves every chart coordinate and cursor',JSON.stringify(await page.evaluate(geometries))===geom&&await page.evaluate(()=>state.currentIndex)===idx);
 await page.locator('#chartCandlesToggle').click();check('Show candles restores price bars',!await page.evaluate(vis));
 for(const [cat,id] of [['previousDay','previousDayLayerToggle'],['pivot','pivotLayerToggle'],['fibonacci','fibLayerToggle']]){
  const prefs=await page.evaluate(statePrefs);await page.locator('#'+id).click();
  check(cat+' switch hides all lines, halos and labels',await page.evaluate(cat=>{const n=[...document.querySelectorAll('#priceChart [data-osd-category="'+cat+'"]')];return n.length>0&&n.every(e=>getComputedStyle(e).visibility==='hidden');},cat));
  check(cat+' switch preserves current/history settings',await page.evaluate(statePrefs)===prefs);
  await page.locator('#nextBtn').click();check(cat+' remains hidden after Next',await page.evaluate(cat=>[...document.querySelectorAll('#priceChart [data-osd-category="'+cat+'"]')].every(e=>getComputedStyle(e).visibility==='hidden'),cat));
  await page.locator('#'+id).click();check(cat+' restores the category in one click',await page.evaluate(cat=>[...document.querySelectorAll('#priceChart [data-osd-category="'+cat+'"]')].every(e=>getComputedStyle(e).visibility!=='hidden'),cat));
 }
 await page.evaluate(study,440);await page.locator('#fractalLevelsToggle').click();
 check('Fractal master removes current and historical levels together',await page.locator('[data-role="fractal-opposite-edge-line"],[data-role="fractal-history-line"]').count()===0);
 check('Fractal symbols remain independent',await page.locator('[data-role="fractal-high"],[data-role="fractal-low"]').count()>0);
 await page.locator('#fractalLevelsToggle').click();check('Fractal master restores saved history preference',await page.evaluate(()=>OSDStructureView.isHistoryOn()&&document.querySelectorAll('[data-role="fractal-opposite-edge-line"]').length>0));
 await page.locator('#chartSettingsToggle').click();
 check('Settings opens inline, with expanded state',await page.evaluate(()=>!document.getElementById('chartSettings').hidden&&document.getElementById('chartSettingsToggle').getAttribute('aria-expanded')==='true'&&!document.getElementById('chartSettings').matches('[role="dialog"]')));
 check('One history setting per applicable category',await page.evaluate(()=>['fractalHistoryToggle','fibHistoryToggle','pivotHistoryToggle'].every(x=>document.querySelectorAll('#'+x).length===1)));
 await page.locator('#fibHistoryToggle').click();check('Fib depth is hidden when History is off',await page.locator('#fibDepthControl').isHidden());
 await page.locator('#fibHistoryToggle').click();await page.locator('#fibHistoryDepth').selectOption('12');check('Fib history depth applies',await page.evaluate(()=>state.fibHistoryDepth===12));
 await page.locator('#pivotHistoryToggle').click();check('Pivot depth is hidden when History is off',await page.locator('#pivotDepthControl').isHidden());
 await page.locator('#pivotHistoryToggle').click();await page.locator('#pivotHistoryDepth').selectOption('5');check('Pivot history depth applies',await page.evaluate(()=>state.pivotHistoryDepth===5));
 await page.locator('#pivotLevelSet').selectOption('P');check('Pivot level choice limits plotted levels',await page.evaluate(()=>[...document.querySelectorAll('[data-role^="daily-pivot-"]')].every(e=>e.dataset.role==='daily-pivot-p')));
 await page.locator('#pivotLevelSet').selectOption('P_R1S1_R2S2');
 check('Live values are available for all categories',await page.evaluate(()=>['toolbarPDH','toolbarPDL','fibUpper','fibLower','pivotPValue','toolbarPivotR2'].every(x=>document.getElementById(x).textContent!=='—')));
 await page.locator('#currentFibToggle').click();check('Current Fib setting hides projections but retains history',await page.locator('[data-role^="fib-current-"]').count()===0&&await page.locator('[data-role^="fib-history-"]').count()>0);await page.locator('#currentFibToggle').click();
 await page.locator('#dailyPivotToggle').click();check('Current pivot setting leaves historical mode intact',await page.evaluate(()=>!state.pivotOn&&state.pivotHistoryOn));await page.locator('#dailyPivotToggle').click();
 await page.locator('#fractalHistoryToggle').click();check('Fractal history switch affects archived lines only',await page.locator('[data-role="fractal-history-line"]').count()===0&&await page.locator('[data-role="fractal-opposite-edge-line"]').count()>0);await page.locator('#fractalHistoryToggle').click();
 await page.locator('#replayControls').screenshot({path:'public/'+folder+'/settings-desktop.png'});
 await page.locator('#closeChartSettings').click();check('Done closes panel and returns keyboard focus',await page.evaluate(()=>document.getElementById('chartSettings').hidden&&document.activeElement.id==='chartSettingsToggle'));
 const cursor=await page.evaluate(()=>state.currentIndex);await page.locator('#chartCandlesToggle').focus();await page.keyboard.press('Space');check('Space toggles candles once without advancing replay',await page.evaluate(vis)&&await page.evaluate(()=>state.currentIndex)===cursor);
 await page.keyboard.press('Enter');check('Enter restores candles without advancing replay',!await page.evaluate(vis)&&await page.evaluate(()=>state.currentIndex)===cursor);
 await page.locator('#chartSettingsToggle').focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');check('Settings Escape returns focus and closes',await page.locator('#chartSettings').isHidden());
 await page.locator('#chartMore summary').click();check('More contains rewind, voice, export and help',await page.locator('#chartMoreActions button').count()===4&&await page.locator('#rewindBtn').isVisible());
 await page.keyboard.press('Escape');check('More closes with Escape',!await page.locator('#chartMore').evaluate(e=>e.open));
 await page.locator('#chartMore summary').click();await page.locator('#replayClock').click();check('More closes on outside click',!await page.locator('#chartMore').evaluate(e=>e.open));
 await page.locator('#chartCandlesToggle').click();await page.locator('#previousDayLayerToggle').click();await page.locator('#chartMore summary').click();
 const downloadPromise=page.waitForEvent('download');await page.locator('#exportChartBtn').click();const dl=await downloadPromise;const exportText=await readFile(await dl.path(),'utf8');
 check('SVG export works from More and retains hidden-layer state',exportText.includes('visibility: hidden')&&exportText.includes('fractal-opposite-edge-line'));
 await page.locator('#chartMore summary').click();await page.locator('#chartMoreActions [data-info="chart"]').click();check('Chart Help opens from More',await page.locator('#infoPopover.open').isVisible());await page.locator('#popoverClose').click();
 await page.locator('#chartMore summary').click();await page.locator('#rewindBtn').click();check('Rewind still returns to selected start',await page.evaluate(()=>state.currentIndex===state.replayStartIndex));
 await page.locator('#nextBtn').click();const afterNext=await page.evaluate(()=>state.currentIndex);await page.locator('#prevBtn').click();check('Next and Previous each move one hour',await page.evaluate(()=>state.currentIndex)===afterNext-1);
 await page.reload();await page.waitForFunction(()=>window.OSDChartToolbar&&state.records.length>400);await page.waitForTimeout(600);
 check('Reload preserves candle and category visibility',await page.evaluate(()=>!OSDStructureView.isCandlesOn()&&!OSDChartToolbar.isEnabled('previousDay')));
 check('Reload preserves detailed history choices',await page.evaluate(()=>state.fibHistoryDepth===12&&state.pivotHistoryDepth===5));
 check('Reload does not reopen settings or More',await page.evaluate(()=>document.getElementById('chartSettings').hidden&&!document.getElementById('chartMore').open));
 check('UI settings do not modify saved research observations',await page.evaluate(()=>JSON.stringify(state.logs))===logs);
 await page.evaluate(study,440);
 for(const width of [320,390,430,700,768,1024,1280,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(160);await page.locator('#chartControlsLink').click();
  const layout=await page.evaluate(()=>{const wrap=document.getElementById('replayControls').getBoundingClientRect();const ids=['prevBtn','nextBtn','chartCandlesToggle','previousDayLayerToggle','fractalLevelsToggle','pivotLayerToggle','fibLayerToggle','chartSettingsToggle'];const boxes=ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});return {width:innerWidth,scroll:document.documentElement.scrollWidth,allFit:boxes.every(r=>r.x>=wrap.left-1&&r.right<=wrap.right+1&&r.w>40&&r.h>=32&&r.hit),overlap:boxes.some((a,i)=>boxes.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1)),boxes};});
  check('No overlapping, clipped or obscured primary controls at '+width+'px',layout.scroll<=width+1&&layout.allFit&&!layout.overlap,layout);
  if([390,1440].includes(width)){await page.locator('#replayControls').screenshot({path:'public/'+folder+'/toolbar-'+width+'.png'});await page.locator('#chartSettingsToggle').click();await page.locator('#replayControls').screenshot({path:'public/'+folder+'/settings-'+width+'.png'});check('Settings fits at '+width+'px',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#closeChartSettings').click();}
 }
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>document.body.style.zoom='2');await page.waitForTimeout(150);check('Controls fit with 200 percent enlargement',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>document.body.style.zoom='');
 for(const mode of ['D1','SPLIT','H1']){await page.locator('[data-daily-mode="'+mode+'"]').first().click();check('Workspace controls stay available in '+mode,await page.locator('#chartCandlesToggle').isVisible());}
 const e=await page.evaluate(()=>({fractal:OSDFractalLevels.selfTest(),history:OSDStructureView.selfTest()}));engines={passed:e.fractal.passed+e.history.passed,total:e.fractal.total+e.history.total};check('Causal fractal and historical engines pass unchanged',e.fractal.pass&&e.history.pass,engines);
 check('No JavaScript page errors in audited workflow',errors.length===0,errors);
}catch(e){check('Audit completed',false,String(e.stack||e));}
finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
const report={version:VERSION,target:remote||'local build',verifiedAt:new Date().toISOString(),passed:tests.filter(t=>t.pass).length,total:tests.length,pass:tests.length>30&&tests.every(t=>t.pass),engines,spaceReduction,errors,tests};
await writeFile('public/'+(remote?'post-deployment-toolbar-audit':'toolbar-audit')+'.json',JSON.stringify(report,null,2));console.log('AUDIT',report.passed+'/'+report.total);if(!report.pass)throw Error('Toolbar audit failed');
