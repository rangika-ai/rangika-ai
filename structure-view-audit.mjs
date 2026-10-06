import {readFile,writeFile,mkdir} from 'node:fs/promises';
async function capture(page,selector,options){
 for(let attempt=0;attempt<3;attempt++){
  await page.waitForTimeout(350);
  try{return await page.locator(selector).screenshot(options);}catch(e){if(attempt===2||!String(e.message).includes('not attached'))throw e;}
 }
}
export async function auditStructureView(page,check){
 await mkdir('public/audit',{recursive:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.waitForFunction(()=>window.OSDStructureView&&document.querySelector('#candlesToggle'));
 const saved=await page.evaluate(()=>({cursor:state.currentIndex,candles:OSDStructureView.isCandlesOn(),history:OSDStructureView.isHistoryOn(),levels:OSDFractalLevels.isEnabled(),context:state.contextBars}));
 await page.evaluate(()=>{state.currentIndex=130;state.contextBars=24;OSDFractalLevels.setEnabled(true);OSDStructureView.setHistory(true);OSDStructureView.setCandles(true);renderAll(false);});
 check('Structure: 24 causal history engine tests',await page.evaluate(()=>OSDStructureEngine.selfTest().pass));
 const geometry=()=>JSON.stringify([...document.querySelectorAll('#priceChart [x1],#priceChart [data-role="price-bar"],#priceChart [data-role="fractal-high"],#priceChart [data-role="fractal-low"]')].map(el=>[el.tagName,...['data-role','x','y','width','height','x1','y1','x2','y2','data-price'].map(a=>el.getAttribute(a))]));
 const before=await page.evaluate(geometry);
 const financialBefore=await page.evaluate(()=>JSON.stringify({cursor:state.currentIndex,trade:state.trade,logs:state.logs.length,excursion:computeExcursion()}));
 await page.locator('#candlesToggle').click();
 const off=await page.evaluate(()=>({hidden:[...document.querySelectorAll('#priceChart [data-role="price-bar"],#priceChart [data-role="close-tick"]')].every(el=>getComputedStyle(el).visibility==='hidden'),count:document.querySelectorAll('#priceChart [data-role="price-bar"]').length,fractals:[...document.querySelectorAll('#priceChart [data-role="fractal-high"],#priceChart [data-role="fractal-low"]')].filter(el=>getComputedStyle(el).visibility!=='hidden').length,levels:document.querySelectorAll('[data-role="fractal-opposite-edge-line"]').length,history:document.querySelectorAll('[data-role="fractal-history-line"]').length,value:document.querySelector('#candlesToggle .control-value').textContent}));
 check('Structure: Candles Off hides all H1 price bars and close ticks',off.hidden&&off.count>0&&off.value==='Off',off);
 check('Structure: confirmed fractal markers and both line layers stay visible',off.fractals>0&&off.levels>0&&off.history>0,off);
 check('Structure: candle visibility does not alter chart coordinates or scale',before===await page.evaluate(geometry));
 check('Structure: candle visibility does not alter replay or research measurements',financialBefore===await page.evaluate(()=>JSON.stringify({cursor:state.currentIndex,trade:state.trade,logs:state.logs.length,excursion:computeExcursion()})));
 const lines=await page.evaluate(()=>[...document.querySelectorAll('[data-role="fractal-history-line"]')].map(el=>{const side=el.dataset.side,origin=+el.dataset.origin,until=+el.dataset.until,f=OSDStructureView.snapshot()[side].find(x=>x.origin===origin),bars=[...document.querySelectorAll('#priceChart [data-role="price-bar"]')],start=state.currentIndex-bars.length+1,b=bars[until-start];return {side,origin,until,valid:!!f&&f.price===+el.dataset.price&&f.until===until&&f.confirmedAt<=state.currentIndex&&until<=state.currentIndex,horizontal:el.getAttribute('y1')===el.getAttribute('y2'),endpoint:!!b&&Math.abs(+el.getAttribute('x2')-(+b.getAttribute('x')+ +b.getAttribute('width')/2))<.01,lighter:+el.getAttribute('opacity')<1};}));
 check('Structure: archived high and low lines use correct opposite-edge prices',lines.length>0&&lines.every(x=>x.valid),lines);
 check('Structure: horizontal history ends exactly at replacement confirmation',lines.every(x=>x.horizontal&&x.endpoint&&x.lighter),lines);
 const active=await page.evaluate(()=>[...document.querySelectorAll('[data-role="fractal-opposite-edge-line"]')].map(x=>[x.dataset.origin,x.dataset.side,x.dataset.state,x.dataset.price]));
 await page.locator('#fractalHistoryToggle').click();
 check('Structure: history switch hides archived lines only',(await page.locator('[data-role="fractal-history-line"]').count())===0&&JSON.stringify(active)===JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('[data-role="fractal-opposite-edge-line"]')].map(x=>[x.dataset.origin,x.dataset.side,x.dataset.state,x.dataset.price]))));
 await page.locator('#fractalHistoryToggle').click();
 check('Structure: history switch restores earlier confirmed segments',(await page.locator('[data-role="fractal-history-line"]').count())===lines.length);
 await page.locator('#fractalLevelsToggle').click();
 check('Structure: master level switch hides current and historical lines',(await page.locator('[data-role="fractal-history-line"],[data-role="fractal-opposite-edge-line"]').count())===0&&await page.locator('#fractalHistoryToggle').isDisabled());
 await page.locator('#fractalLevelsToggle').click();
 check('Structure: master switch restores saved history preference',(await page.locator('[data-role="fractal-history-line"]').count())===lines.length&&!await page.locator('#fractalHistoryToggle').isDisabled());
 const sequence=await page.evaluate(()=>{
  const all=[];
  for(const side of ['high','low']){
   const f=OSDStructureEngine.history(state.records,300)[side][3];if(!f){all.push({side,pass:false});continue;}
   state.currentIndex=f.confirmedAt;renderAll(false);
   const previous=OSDStructureView.snapshot()[side].at(-2);
   const selector=`[data-role="fractal-history-line"][data-side="${side}"][data-origin="${previous.origin}"]`;
   const ended=document.querySelector(selector)?.dataset.until===String(f.confirmedAt);
   state.currentIndex=f.confirmedAt-1;renderAll(false);
   const open=OSDStructureView.snapshot()[side].at(-1),candidate=document.querySelector(`[data-role="fractal-opposite-edge-line"][data-side="${side}"][data-state="developing"][data-origin="${f.origin}"]`);
   const rewind=open.origin===previous.origin&&open.until===null&&!document.querySelector(selector)&&!!candidate;
   state.currentIndex=f.confirmedAt;renderAll(false);
   const forward=!!document.querySelector(selector);
   all.push({side,ended,rewind,forward,pass:ended&&rewind&&forward});
  }return all;
 });
 check('Structure: rewind and forward correctly reopen and archive both histories',sequence.every(x=>x.pass),sequence);
 await page.evaluate(()=>{state.currentIndex=130;renderAll(false);});
 const dl=page.waitForEvent('download');await page.evaluate(()=>exportChart());const download=await dl;const exported=await readFile(await download.path(),'utf8');
 check('Structure: exported SVG preserves hidden candles and visible history',/visibility:\s*hidden/.test(exported)&&exported.includes('fractal-history-line')&&exported.includes('fractal-opposite-edge-line'));
 await writeFile('public/audit/structure-only.svg',exported);
 const report=[];
 for(const width of [1920,1440,1280,1024,768,700,430,390,320]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(160);await page.evaluate(()=>renderAll(false));
  const m=await page.evaluate(()=>{
   const group=document.querySelector('.osd-structure-controls'),r=group.getBoundingClientRect(),children=[...group.children].map(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};});
   const ref=document.getElementById('currentFibToggle'),style=el=>{const l=getComputedStyle(el.querySelector('.control-label')),v=getComputedStyle(el.querySelector('.control-value')),b=getComputedStyle(el);return [l.fontFamily,l.fontSize,l.fontWeight,l.lineHeight,v.fontFamily,v.fontSize,v.fontWeight,v.lineHeight,b.padding,b.borderRadius,el.getBoundingClientRect().height];};
   const matching=['candlesToggle','fractalHistoryToggle'].every(id=>JSON.stringify(style(document.getElementById(id)))===JSON.stringify(style(ref)));
   const fits=children.every(b=>b.x>=r.x-1&&b.right<=r.right+1&&b.y>=r.y-1&&b.bottom<=r.bottom+1),overlap=children.some((b,i)=>children.slice(i+1).some(c=>Math.min(b.right,c.right)-Math.max(b.x,c.x)>1&&Math.min(b.bottom,c.bottom)-Math.max(b.y,c.y)>1));
   return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,matching,fits,overlap,children};
  });report.push(m);check(`Structure UI: shared typography and no overlap at ${width}px`,m.matching&&m.fits&&!m.overlap&&m.scrollWidth<=width+2,m);
  if(width===1440||width===390){await capture(page,'#priceChart',{path:`public/audit/structure-only-${width}.png`});await capture(page,'.osd-structure-controls',{path:`public/audit/structure-controls-${width}.png`});}
 }
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(180);
 await page.locator('#candlesToggle').focus();await page.keyboard.press('Tab');
 check('Structure UI: keyboard focus reaches Fractal History',await page.locator('#fractalHistoryToggle').evaluate(el=>document.activeElement===el&&getComputedStyle(el).outlineStyle!=='none'));
 const cursor=await page.evaluate(()=>state.currentIndex);await page.keyboard.press('Space');
 check('Structure UI: Space toggles history without advancing replay',await page.evaluate(c=>!OSDStructureView.isHistoryOn()&&state.currentIndex===c,cursor));
 await page.keyboard.press('Enter');
 check('Structure UI: Enter toggles history without advancing replay',await page.evaluate(c=>OSDStructureView.isHistoryOn()&&state.currentIndex===c,cursor));
 await page.locator('#candlesToggle').focus();await page.keyboard.press('Space');
 check('Structure UI: Space restores candles without advancing replay',await page.evaluate(c=>OSDStructureView.isCandlesOn()&&state.currentIndex===c&&[...document.querySelectorAll('#priceChart [data-role="price-bar"]')].every(el=>getComputedStyle(el).visibility!=='hidden'),cursor));
 await page.locator('#candlesToggle').click();await page.locator('#fractalHistoryToggle').click();
 await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.OSDStructureView&&typeof state!=='undefined'&&state.records.length>20&&document.querySelector('#candlesToggle'));
 check('Structure UI: candle and history preferences persist across reload',await page.evaluate(()=>!OSDStructureView.isCandlesOn()&&!OSDStructureView.isHistoryOn()&&document.querySelector('#candlesToggle .control-value').textContent==='Off'&&document.querySelector('#fractalHistoryToggle .control-value').textContent==='Off'));
 await page.evaluate(()=>{OSDStructureView.setHistory(true);state.currentIndex=130;renderAll(false);document.getElementById('nextBtn').click();document.getElementById('prevBtn').click();});
 check('Structure: hidden-candle setting survives replay redraws',await page.evaluate(()=>[...document.querySelectorAll('#priceChart [data-role="price-bar"],#priceChart [data-role="close-tick"]')].every(el=>getComputedStyle(el).visibility==='hidden')&&document.querySelectorAll('#candlesToggle').length===1&&document.querySelectorAll('#fractalHistoryToggle').length===1));
 await page.locator('.osd-structure-controls [data-info="structureView"]').click();
 check('Structure UI: contextual help opens',await page.locator('#popoverTitle').textContent()==='Structure-only view');
 await page.locator('#popoverClose').click();
 await page.setViewportSize({width:640,height:900});await page.evaluate(()=>{document.documentElement.style.zoom='2';renderAll(false);});await page.waitForTimeout(180);
 const zoom=await page.locator('.osd-structure-controls').evaluate(el=>{const g=el.getBoundingClientRect();return [...el.children].every(c=>{const b=c.getBoundingClientRect();return b.left>=g.left-1&&b.right<=g.right+1;})&&document.documentElement.scrollWidth<=innerWidth+2;});
 check('Structure UI: controls fit at 200 percent zoom',zoom);
 await page.evaluate(()=>{document.documentElement.style.zoom='';OSDStructureView.setCandles(false);OSDStructureView.setHistory(true);state.currentIndex=130;state.contextBars=24;renderAll(false);});
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(180);await page.evaluate(()=>document.activeElement?.blur());
 await capture(page,'#priceChart',{path:'public/audit/structure-preview.png'});
 await writeFile('public/audit/structure-preview.json',JSON.stringify({mime:'image/png',base64:(await readFile('public/audit/structure-preview.png')).toString('base64')}));
 await writeFile('public/audit/structure-ui.json',JSON.stringify(report,null,2));
 await page.evaluate(s=>{state.currentIndex=s.cursor;state.contextBars=s.context;OSDFractalLevels.setEnabled(s.levels);OSDStructureView.setHistory(s.history);OSDStructureView.setCandles(s.candles);renderAll(false);},saved);
}
