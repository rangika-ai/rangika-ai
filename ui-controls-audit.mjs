import {mkdir,writeFile} from 'node:fs/promises';

// Called by the existing browser audit with the same real app and error listener.
export async function auditControls(page,record){
 const check=(name,pass,detail)=>{record(name,pass,detail);if(!pass)console.log('UI_FAILURE_DETAIL',name,JSON.stringify(detail));};
 try{
 await mkdir('public/audit',{recursive:true});
 // Exercise the normal onboarding flow rather than clicking through a modal.
 if(await page.locator('#welcomeModal.open').isVisible()){
  await page.locator('#dontShowWelcome').check();
  await page.locator('#welcomeStartBtn').click();
  await page.locator('#welcomeModal').waitFor({state:'hidden'});
 }
 const original=await page.evaluate(()=>({cursor:state.currentIndex,enabled:OSDFractalLevels.isEnabled()}));
 const button=page.locator('#fractalLevelsToggle');
 const widths=[1920,1440,1280,1024,768,700,430,390,320];
 const measurements=[];
 const inspect=()=>{
  const zoom=Number.parseFloat(getComputedStyle(document.documentElement).zoom)||1;
  const box=id=>{
   const el=document.getElementById(id),r=el.getBoundingClientRect(),s=getComputedStyle(el);
   const part=selector=>{const p=el.querySelector(selector);if(!p)return null;const t=getComputedStyle(p),v=p.getBoundingClientRect();return {text:p.textContent,font:t.fontFamily,size:t.fontSize,weight:t.fontWeight,line:t.lineHeight,spacing:t.letterSpacing,x:v.x,y:v.y,width:v.width,height:v.height};};
   return {x:r.x,y:r.y,width:r.width,height:r.height,padding:s.padding,border:s.border,background:s.backgroundColor,color:s.color,radius:s.borderRadius,label:part('.control-label'),value:part('.control-value'),pressed:el.getAttribute('aria-pressed')};
  };
  const a=box('currentFibToggle'),b=box('fractalLevelsToggle'),group=document.querySelector('.fib-controls.has-fractal-levels'),r=group.getBoundingClientRect();
  const children=[...group.children].map(el=>{const q=el.getBoundingClientRect();return {id:el.id||el.className,x:q.x,y:q.y,width:q.width,height:q.height,right:q.right,bottom:q.bottom};});
  const contained=children.every(q=>q.x>=r.x-1&&q.right<=r.right+1&&q.y>=r.y-1&&q.bottom<=r.bottom+1);
  const overlap=children.some((x,i)=>children.slice(i+1).some(y=>Math.min(x.right,y.right)-Math.max(x.x,y.x)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.y,y.y)>1));
  const properties=['font','size','weight','line','spacing'];
  const matching=!!a.label&&!!b.label&&!!a.value&&!!b.value&&properties.every(k=>a.label[k]===b.label[k]&&a.value[k]===b.value[k])&&a.padding===b.padding&&a.radius===b.radius&&Math.abs(a.height-b.height)<1;
  const labelFits=!!b.label&&b.label.x+b.label.width<=b.x+b.width-3&&b.label.height<parseFloat(b.label.line)*1.2*zoom;
  return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,a,b,children,contained,overlap,matching,labelFits,zoom};
 };
 await page.evaluate(()=>{state.currentIndex=Math.max(46,state.currentIndex);OSDFractalLevels.setEnabled(true);if(!state.currentFibOn)document.getElementById('currentFibToggle').click();});
 for(const width of widths){
  await page.setViewportSize({width,height:1000});await page.mouse.move(0,0);await page.waitForTimeout(160);await page.evaluate(()=>renderAll(false));
  const m=await page.evaluate(inspect);measurements.push(m);
  check(`UI: matching two-line control at ${width}px`,m.matching&&m.labelFits&&m.b.label.text==='Fractal levels'&&m.b.value.text==='On',m);
  check(`UI: all five controls fit at ${width}px`,m.contained&&!m.overlap&&m.scrollWidth<=m.width+2,{contained:m.contained,overlap:m.overlap,scrollWidth:m.scrollWidth,children:m.children});
  if(width===1440||width===390){
   const image=await page.locator('.fib-controls.has-fractal-levels').screenshot({path:`public/audit/controls-${width}.png`});
   await writeFile(`public/audit/button-preview-${width}.json`,JSON.stringify({mime:'image/png',base64:image.toString('base64')}));
   await page.screenshot({path:`public/audit/ui-page-${width}.png`,fullPage:true});
  }
 }
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(160);
 await button.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(160);
 console.log('UI_POINTER_TARGET',JSON.stringify(await button.evaluate(el=>{const r=el.getBoundingClientRect();return {target:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML?.slice(0,400),modals:[...document.querySelectorAll('.modal-backdrop.open')].map(x=>x.id)};})));
 await button.click({timeout:10000});await page.mouse.move(0,0);await page.waitForTimeout(130);
 const off=await button.evaluate(el=>({label:el.querySelector('.control-label')?.textContent,value:el.querySelector('.control-value')?.textContent,pressed:el.getAttribute('aria-pressed'),active:el.classList.contains('active'),outline:getComputedStyle(el).outlineStyle,lines:document.querySelectorAll('[data-role="fractal-opposite-edge-line"]').length,hidden:document.getElementById('fractalLevelReadout').hidden}));
 check('UI: off state preserves label and removes levels',off.label==='Fractal levels'&&off.value==='Off'&&off.pressed==='false'&&!off.active&&off.lines===0&&off.hidden,off);
 check('UI: pointer click has no persistent focus ring',off.outline==='none',off.outline);
 await page.evaluate(()=>document.getElementById('currentFibToggle').focus());await page.keyboard.press('Tab');
 const focus=await button.evaluate(el=>({focused:document.activeElement===el,visible:el.matches(':focus-visible'),outline:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth,name:el.getAttribute('aria-label')}));
 check('UI: Tab reaches named control with visible keyboard focus',focus.focused&&focus.visible&&focus.outline!=='none'&&parseFloat(focus.width)>=2&&focus.name==='Fractal levels',focus);
 const cursor=await page.evaluate(()=>state.currentIndex);
 await page.keyboard.press('Space');
 const space=await page.evaluate(()=>({enabled:OSDFractalLevels.isEnabled(),cursor:state.currentIndex,value:document.querySelector('#fractalLevelsToggle .control-value')?.textContent,pressed:document.getElementById('fractalLevelsToggle').getAttribute('aria-pressed')}));
 check('UI: Space toggles once without advancing replay',space.enabled&&space.cursor===cursor&&space.value==='On'&&space.pressed==='true',space);
 await page.keyboard.press('Enter');
 const enter=await page.evaluate(()=>({enabled:OSDFractalLevels.isEnabled(),cursor:state.currentIndex,value:document.querySelector('#fractalLevelsToggle .control-value')?.textContent}));
 check('UI: Enter toggles once without advancing replay',!enter.enabled&&enter.cursor===cursor&&enter.value==='Off',enter);
 await page.reload({waitUntil:'load'});await page.waitForFunction(()=>typeof state!=='undefined'&&state.records.length>20&&!!document.querySelector('#fractalLevelsToggle .control-value'));
 const persisted=await page.evaluate(()=>({value:document.querySelector('#fractalLevelsToggle .control-value').textContent,enabled:OSDFractalLevels.isEnabled(),label:document.querySelector('#fractalLevelsToggle .control-label').textContent}));
 check('UI: off setting and two-line component survive reload',!persisted.enabled&&persisted.value==='Off'&&persisted.label==='Fractal levels',persisted);
 await page.evaluate(()=>{OSDFractalLevels.setEnabled(true);for(let k=0;k<8;k++)renderAll(false);});
 check('UI: repeated replay renders preserve one control and its children',await page.evaluate(()=>document.querySelectorAll('#fractalLevelsToggle').length===1&&document.querySelectorAll('#fractalLevelsToggle .control-label').length===1&&document.querySelectorAll('#fractalLevelsToggle .control-value').length===1));
 await page.setViewportSize({width:640,height:900});await page.evaluate(()=>document.documentElement.style.zoom='2');await page.waitForTimeout(180);await page.evaluate(()=>renderAll(false));
 const zoom=await page.evaluate(inspect);check('UI: 200 percent zoom preserves control layout',zoom.matching&&zoom.labelFits&&zoom.contained&&!zoom.overlap,zoom);
 await page.evaluate(o=>{document.documentElement.style.zoom='';state.currentIndex=o.cursor;OSDFractalLevels.setEnabled(o.enabled);},original);
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(180);
 await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());
 const image=await page.locator('.fib-controls.has-fractal-levels').screenshot();
 await writeFile('public/audit/button-preview.json',JSON.stringify({mime:'image/png',base64:image.toString('base64')}));
 await writeFile('public/audit/ui-controls.json',JSON.stringify({measurements,version:'3.5.1-fractal-controls'},null,2));
 }catch(error){console.log('UI_AUDIT_EXCEPTION',String(error.stack||error));throw error;}
}
