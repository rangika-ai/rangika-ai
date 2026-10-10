import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import path from 'node:path';
import chromium from '@sparticuz/chromium';
import {chromium as pw} from 'playwright-core';
const remote=process.env.OSD_COLOUR_AUDIT_URL,tests=[],errors=[];
let browser,server;const root=path.resolve('public');
const check=(name,pass,detail)=>{tests.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});console.log('COLOUR',pass?'PASS':'FAIL',name);if(!pass)console.log(JSON.stringify(detail));};
const colour={high:'#79518a',low:'#0b7371'},rgb={high:'rgb(121, 81, 138)',low:'rgb(11, 115, 113)'};
async function ready(page,url){await page.goto(url,{waitUntil:'load',timeout:60000});await page.waitForFunction(()=>typeof state!=='undefined'&&state.records.length>100&&document.querySelector('#priceChart'));await page.waitForTimeout(2300);if(await page.locator('#welcomeModal.open').isVisible()){await page.locator('#dontShowWelcome').check();await page.locator('#welcomeStartBtn').click();await page.locator('#welcomeModal').waitFor({state:'hidden'});}}
async function setStudy(page){await page.evaluate(()=>{state.currentIndex=200;state.contextBars=24;OSDFractalLevels.setEnabled(true);OSDStructureView.setHistory(true);OSDStructureView.setCandles(true);renderAll(false);});}
function geometry(){const fields=['x','y','x1','x2','y1','y2','width','height','d','data-origin','data-price','data-until'];return [...document.querySelectorAll('#priceChart [data-role]')].map(el=>[el.dataset.role,...fields.map(k=>el.getAttribute(k))]);}
function unrelated(){return [...document.querySelectorAll('#priceChart [data-role^="fib-"],#priceChart [data-role="pdh-line"],#priceChart [data-role="pdl-line"],#priceChart [data-role^="daily-pivot-"]')].map(el=>[el.dataset.role,el.getAttribute('stroke'),el.getAttribute('fill'),el.getAttribute('opacity')]);}
try{
 await mkdir('public/audit',{recursive:true});
 let url=remote;
 if(!url){server=createServer(async(req,res)=>{try{let u=new URL(req.url,'http://localhost').pathname;if(u==='/')u='/index.html';const p=path.resolve(root,'.'+u);if(!p.startsWith(root+path.sep))throw Error('Invalid path');const data=await readFile(p);res.writeHead(200,{'content-type':p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.js')?'text/javascript':'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/`;}
 browser=await pw.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(String(e.message||e)));
 await ready(page,url);await setStudy(page);
 const served=await page.request.get(url);const text=await served.text();const build=JSON.parse(await readFile('public/build-report.json','utf8'));
 check('Served full app is the expected 3.6.2 artifact',served.status()===200&&createHash('sha256').update(text).digest('hex')===build.finalSHA256);
 check('Visible version and colour module agree',await page.evaluate(()=>document.getElementById('osdReleaseBadge').textContent==='v3.6.2'&&OSDFractalColours.version==='3.6.2'));
 check('Hide candles remains directly beside Next',await page.evaluate(()=>document.getElementById('nextBtn').nextElementSibling?.id==='chartCandlesToggle'));
 const baseline=await browser.newPage({viewport:{width:1440,height:1000}});
 await ready(baseline,new URL('colour-baseline.html',url).href);await setStudy(baseline);
 check('Changing colours preserves every chart coordinate and historical endpoint',JSON.stringify(await baseline.evaluate(geometry))===JSON.stringify(await page.evaluate(geometry)));
 check('Pivots, Fibonacci and previous-day colours are unchanged',JSON.stringify(await baseline.evaluate(unrelated))===JSON.stringify(await page.evaluate(unrelated)));
 const lineState=await page.evaluate(()=>({current:[...document.querySelectorAll('[data-role="fractal-opposite-edge-line"]')].map(el=>({side:el.dataset.side,stroke:el.getAttribute('stroke'),width:+el.getAttribute('stroke-width'),opacity:+el.getAttribute('opacity'),label:el.parentElement.querySelector('text')?.getAttribute('fill'),state:el.dataset.state})),history:[...document.querySelectorAll('[data-role="fractal-history-line"]')].map(el=>({side:el.dataset.side,stroke:el.getAttribute('stroke'),width:+el.getAttribute('stroke-width'),opacity:+el.getAttribute('opacity')}))}));
 for(const side of ['high','low']){
  const active=lineState.current.filter(x=>x.side===side),old=lineState.history.filter(x=>x.side===side);
  check(`${side}: active line and label use the same distinct colour`,active.length>0&&active.every(x=>x.stroke===colour[side]&&x.label===colour[side]));
  check(`${side}: retained history uses the matching colour family`,old.length>0&&old.every(x=>x.stroke===colour[side]));
 }
 check('Historical lines are quieter than active lines',lineState.history.length>0&&lineState.history.every(x=>x.opacity===0.42&&x.width===1.05)&&lineState.current.every(x=>x.opacity===1&&x.width>=1.8));
 const readouts=await page.locator('#fractalLevelReadout span').evaluateAll(a=>a.map(el=>({text:el.textContent,colour:getComputedStyle(el).color})));
 check('Readout colours match their series',readouts.length>=2&&readouts.every(x=>x.colour===(x.text.startsWith('HF low')?rgb.high:rgb.low)),readouts);
 for(const side of ['high','low']){
  check(`${side}: confirmed symbols match their corresponding levels`,await page.locator(`[data-role="fractal-${side}"]`).evaluateAll((a,expected)=>a.length>0&&a.every(el=>el.getAttribute('fill')===expected),colour[side]));
  const candidate=await page.evaluate(side=>{for(let n=3;n<1000;n++){const f=OSDFractalEngine.compute(state.records,n)[side].candidate;if(f)return n;}return null;},side);
  await page.evaluate(n=>{state.currentIndex=n;renderAll(false);},candidate);
  const dev=await page.evaluate(side=>{const el=document.querySelector(`[data-role="fractal-opposite-edge-line"][data-side="${side}"][data-state="developing"]`),symbol=document.querySelector(`[data-role="potential-fractal-${side}"]`);return {stroke:el?.getAttribute('stroke'),dash:el?.getAttribute('stroke-dasharray'),lineAnimation:el?getComputedStyle(el.parentElement).animationName:null,symbolAnimation:symbol?getComputedStyle(symbol).animationName:null,marker:symbol?.querySelector('.potential-fractal-marker')?.getAttribute('stroke')};},side);
  check(`${side}: candidate colour, dashed line and symbol pulse remain synchronized`,dev.stroke===colour[side]&&dev.marker===colour[side]&&!!dev.dash&&dev.lineAnimation!=='none'&&dev.lineAnimation===dev.symbolAnimation,dev);
 }
 await setStudy(page);
 check('Text legend identifies both series without colour alone',await page.locator('#fractalColourLegend').evaluate(el=>el.textContent.includes('HF LOW')&&el.textContent.includes('LF HIGH')&&el.textContent.includes('developing')&&!el.hidden));
 const ratio=(hex)=>{const vals=hex.match(/[0-9a-f]{2}/gi).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return vals[0]*.2126+vals[1]*.7152+vals[2]*.0722;};
 const bg=ratio('#f7f6f0'),ratios=Object.fromEntries(Object.entries(colour).map(([s,c])=>[s,(bg+.05)/(ratio(c)+.05)]));
 check('Both series text colours exceed 4.5:1 against chart paper',Object.values(ratios).every(v=>v>=4.5),ratios);
 await page.locator('#chartControlsLink').click();await page.locator('#chartCandlesToggle').click();
 check('Hide candles keeps coloured levels and symbols visible',await page.evaluate(()=>!OSDStructureView.isCandlesOn()&&[...document.querySelectorAll('[data-role="price-bar"],[data-role="close-tick"]')].every(e=>getComputedStyle(e).visibility==='hidden')&&document.querySelectorAll('[data-role="fractal-history-line"]').length>0&&document.querySelectorAll('[data-role="fractal-high"]').length>0));
 await page.locator('#chartFractalHistoryToggle').click();check('History off removes archives but retains current coloured lines',await page.locator('[data-role="fractal-history-line"]').count()===0&&await page.locator('[data-role="fractal-opposite-edge-line"]').count()>0);await page.locator('#chartFractalHistoryToggle').click();
 await page.locator('#chartFractalLevelsToggle').click();check('Master switch also hides the colour legend',await page.locator('#fractalColourLegend').evaluate(el=>el.hidden)&&await page.locator('[data-role="fractal-opposite-edge-line"]').count()===0);await page.locator('#chartFractalLevelsToggle').click();
 const downloadPromise=page.waitForEvent('download');await page.locator('#exportChartBtn').click();const download=await downloadPromise;const xml=await readFile(await download.path(),'utf8');
 check('Exported SVG retains both palette colours, history and hidden candles',xml.includes('#79518a')&&xml.includes('#0b7371')&&xml.includes('fractal-history-line')&&xml.includes('visibility: hidden'));
 await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.OSDFractalColours&&typeof state!=='undefined'&&state.records.length>100);await page.waitForTimeout(400);
 check('Reload retains hidden candles and the new colour system',await page.evaluate(()=>!OSDStructureView.isCandlesOn()&&OSDFractalColours.version==='3.6.2'&&document.querySelectorAll('#fractalColourLegend').length===1));
 await page.evaluate(()=>{state.currentIndex=200;for(let i=0;i<8;i++)renderAll(false);});
 check('Repeated replay renders do not duplicate legend or revert colours',await page.evaluate(()=>document.querySelectorAll('#fractalColourLegend').length===1&&[...document.querySelectorAll('[data-role="fractal-opposite-edge-line"]')].every(el=>el.getAttribute('stroke')===OSDFractalColours.palette[el.dataset.side].colour)));
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(350);await page.evaluate(()=>renderAll(false));
  const layout=await page.locator('#fractalColourLegend').evaluate(el=>{const r=el.getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,contained:[...el.children].every(c=>{const b=c.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;}),legend:!el.hidden};});
  check(`Colour legend fits without overflow at ${width}px`,layout.legend&&layout.contained&&layout.scroll<=width+1,layout);
 }
 await page.setViewportSize({width:1440,height:1100});await page.waitForTimeout(500);await page.evaluate(()=>{state.currentIndex=200;state.contextBars=24;renderAll(false);document.activeElement?.blur();});
 await page.waitForTimeout(500);
 for(const [selector,name] of [['#chartViewport','colour-chart'],['#fractalColourLegend','colour-legend'],['#replayControls','colour-toolbar']]){
  for(let attempt=0;attempt<3;attempt++){try{await page.locator(selector).screenshot({path:`public/audit/${name}.png`});break;}catch(e){if(attempt===2)throw e;await page.waitForTimeout(500);}}
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await page.evaluate(()=>{for(let n=3;n<500;n++){if(OSDFractalEngine.compute(state.records,n).high.candidate){state.currentIndex=n;renderAll(false);break;}}return [...document.querySelectorAll('.osd-fractal-provisional')].every(el=>getComputedStyle(el).animationName==='none');});
 check('Reduced motion is still respected',reduced);
 check('No JavaScript errors in colour interactions',errors.length===0,errors);
 await baseline.close();
}catch(e){check('Colour audit completed',false,String(e.stack||e));}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
const report={version:'3.6.2',scope:remote?'live deployment':'final local artifact',passed:tests.filter(t=>t.pass).length,total:tests.length,pass:tests.every(t=>t.pass),tests,errors};
await writeFile('public/'+(remote?'post-deployment-colours':'fractal-colours-audit')+'.json',JSON.stringify(report,null,2));
console.log('COLOUR AUDIT',report.passed+'/'+report.total);if(!report.pass)throw Error('Fractal colour audit failed');
