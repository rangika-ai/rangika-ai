/* OSD 3.7.0 — one control per action; existing data and engines are unchanged. */
(function(root){
 'use strict';
 if(typeof document==='undefined')return;
 const VERSION='3.7.0',KEY='osd.chart.layerVisibility.v1';
 const q=id=>document.getElementById(id);
 let layers={previousDay:true,pivot:true,fibonacci:true};
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');for(const k of Object.keys(layers))if(typeof saved[k]==='boolean')layers[k]=saved[k];}catch{}
 const ready=()=>typeof state!=='undefined'&&Array.isArray(state.records)&&state.records.length>0;
 const value=n=>Number.isFinite(n)?(typeof fmt==='function'?fmt(n,2):n.toFixed(2)):'—';
 function isEnabled(category){return category==='fractal'?!!root.OSDFractalLevels?.isEnabled():layers[category]!==false;}
 function setLayer(category,on){
  if(category==='fractal'){root.OSDFractalLevels.setEnabled(!!on);sync();return;}
  if(!Object.hasOwn(layers,category))throw Error('Unknown chart category');
  layers[category]=!!on;try{localStorage.setItem(KEY,JSON.stringify(layers));}catch{}
  sync();
 }
 function applyVisibility(){
  const svg=q('priceChart');if(!svg)return;
  for(const e of svg.querySelectorAll('[data-osd-category]')){
   const c=e.dataset.osdCategory;if(c==='fractal'||!Object.hasOwn(layers,c))continue;
   if(!layers[c]){e.dataset.layerHidden='true';e.style.visibility='hidden';e.style.pointerEvents='none';}
   else if(e.dataset.layerHidden){e.style.removeProperty('visibility');e.style.removeProperty('pointer-events');delete e.dataset.layerHidden;}
  }
 }
 function sync(){
  applyVisibility();
  const candle=q('chartCandlesToggle'),visible=root.OSDStructureView?.isCandlesOn()!==false;
  if(candle){candle.textContent=visible?'Hide candles':'Show candles';candle.dataset.hidden=String(!visible);candle.title=visible?'Hide H1 price bars without hiding indicators or changing the scale.':'Restore H1 price bars.';}
  for(const button of document.querySelectorAll('#replayControls .osd-layer')){
   const enabled=isEnabled(button.dataset.category);button.setAttribute('aria-pressed',String(enabled));button.querySelector('.osd-check').textContent=enabled?'✓':'−';button.classList.toggle('active',enabled);
  }
  for(const text of document.querySelectorAll('[data-layer-status]')){
   const c=text.dataset.layerStatus;let status=isEnabled(c)?'':'Layer hidden · settings retained';
   if(!status&&ready()&&((c==='fibonacci'&&!state.currentFibOn&&!state.fibHistoryOn)||(c==='pivot'&&!state.pivotOn&&!state.pivotHistoryOn)))status='No current or historical lines selected';
   text.textContent=status;
  }
  if(!ready())return;
  q('fibDepthControl').hidden=!state.fibHistoryOn;q('fibHistoryDepth').disabled=!state.fibHistoryOn;
  const r=state.records[state.currentIndex];if(!r)return;
  q('toolbarSession').textContent=typeof sessionForHour==='function'?sessionForHour(r.hour):'';
  q('toolbarPDH').textContent=value(r.pdh);q('toolbarPDL').textContent=value(r.pdl);
  q('toolbarDaySource').textContent=r.pivotSourceDate&&typeof formatDateKey==='function'?formatDateKey(r.pivotSourceDate):'Previous trading day';
  const p=typeof pivotSnapshotForRecord==='function'?pivotSnapshotForRecord(r):null;
  q('toolbarPivotR2').textContent=value(p?.R2);q('toolbarPivotS2').textContent=value(p?.S2);
  for(const el of document.querySelectorAll('[data-pivot-detail]'))el.hidden=!selectedPivotLevels().includes(el.dataset.pivotDetail);
  q('osdReleaseBadge')?.replaceChildren(document.createTextNode('v'+VERSION));
 }
 function setSettings(open,focus=false){q('chartSettings').hidden=!open;q('chartSettingsToggle').setAttribute('aria-expanded',String(open));q('chartSettingsToggle').querySelector('span').textContent=open?'⌃':'⌄';if(focus)q('chartSettingsToggle').focus();}
 function bind(){
  if(root.OSDChartToolbar)return;
  root.OSDChartToolbar=Object.freeze({version:VERSION,setLayer,isEnabled,sync,getLayers:()=>({...layers,fractal:isEnabled('fractal')}),setSettings});
  q('chartCandlesToggle').addEventListener('click',()=>{root.OSDStructureView.setCandles(!root.OSDStructureView.isCandlesOn());sync();});
  for(const b of document.querySelectorAll('#replayControls .osd-layer'))b.addEventListener('click',()=>setLayer(b.dataset.category,!isEnabled(b.dataset.category)));
  q('fractalHistoryToggle').addEventListener('click',()=>{root.OSDStructureView.setHistory(!root.OSDStructureView.isHistoryOn());sync();});
  q('chartSettingsToggle').addEventListener('click',()=>{q('chartMore').open=false;setSettings(q('chartSettings').hidden);});
  q('closeChartSettings').addEventListener('click',()=>setSettings(false,true));
  q('replayControls').addEventListener('keydown',e=>{
   if((e.key===' '||e.key==='Enter')&&e.target.closest('button,summary,select,input'))e.stopPropagation();
   if(e.key==='Escape'){
    if(q('chartMore').open){q('chartMore').open=false;q('chartMore').querySelector('summary').focus();}
    else if(!q('chartSettings').hidden)setSettings(false,true);
    e.stopPropagation();
   }
  });
  q('chartMore').addEventListener('toggle',()=>q('chartMore').querySelector('summary').setAttribute('aria-expanded',String(q('chartMore').open)));
  q('chartMore').querySelector('summary').setAttribute('aria-expanded','false');
  q('chartMoreActions').addEventListener('click',e=>{if(e.target.closest('button')&&!e.target.closest('#chartVoiceToggle'))requestAnimationFrame(()=>q('chartMore').open=false);});
  document.addEventListener('click',e=>{if(!q('chartMore').contains(e.target))q('chartMore').open=false;});
  q('chartControlsLink')?.addEventListener('click',e=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();history.replaceState(null,'','#replayControls');q('replayControls').scrollIntoView({block:'start',behavior:'instant'});q('chartCandlesToggle').focus({preventScroll:true});});
  const footer=document.querySelector('.footer');if(footer&&!q('osdReleaseBadge')){const badge=document.createElement('span');badge.id='osdReleaseBadge';badge.textContent='v'+VERSION;footer.appendChild(badge);}
  if(typeof renderChart==='function'){const previous=renderChart;renderChart=function(){const result=previous.apply(this,arguments);sync();return result;};root.renderChart=renderChart;}
  if(typeof renderAll==='function'){const previous=renderAll;renderAll=function(){const result=previous.apply(this,arguments);sync();return result;};root.renderAll=renderAll;}
  if(typeof HELP_CONTENT!=='undefined')HELP_CONTENT.chart.body+=' Use the Layers row to show or hide an entire line category without changing its saved settings. Chart settings contains current/history choices and live values. Hide candles is beside Next; More contains rewind, voice and chart export.';
  sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(globalThis);
