/* OSD 3.6.1: visible, synchronized chart controls; no price-engine changes. */
(function(root){
 'use strict';
 const VERSION='3.6.1';
 if(typeof document==='undefined')return;
 const q=id=>document.getElementById(id);
 function sync(){
  const view=root.OSDStructureView,levels=root.OSDFractalLevels;
  if(!view||!levels)return;
  const candles=view.isCandlesOn(),showLevels=levels.isEnabled(),history=view.isHistoryOn();
  const hide=q('chartCandlesToggle');
  if(hide){hide.disabled=false;hide.textContent=candles?'Hide candles':'Show candles';hide.dataset.hidden=String(!candles);hide.classList.toggle('active',!candles);hide.title=candles?'Hide H1 price bars and close ticks. Keep indicators and the same scale.':'Restore H1 price bars and close ticks.';}
  for(const [id,label,on] of [['chartFractalLevelsToggle','Fractal levels',showLevels],['chartFractalHistoryToggle','Fractal history',history]]){
   const el=q(id);if(!el)continue;el.disabled=id==='chartFractalHistoryToggle'&&!showLevels;el.textContent=label+': '+(on?'ON':'OFF');el.setAttribute('aria-pressed',String(on));el.classList.toggle('active',on);el.title=id==='chartFractalHistoryToggle'&&!showLevels?'Enable Fractal levels to display their history.':'Toggle '+label.toLowerCase();
  }
  const status=q('chartLayerStatus');
  if(status){const d1=typeof state!=='undefined'&&state.dailyView==='D1';status.textContent=(d1?'H1 layers · select H1 or Split to view them.':candles?'H1 candles visible.':'Structure-only H1 · candles hidden.')+(!showLevels&&history?' History retained; enable Fractal levels to show it.':'');}
 }
 function bind(){
  if(root.OSDVisibleChartControls)return;
  const view=root.OSDStructureView,levels=root.OSDFractalLevels;
  if(!view||!levels){const status=q('chartLayerStatus');if(status)status.textContent='Chart controls could not initialize. Reload the page.';return;}
  q('chartCandlesToggle')?.addEventListener('click',()=>{view.setCandles(!view.isCandlesOn());sync();});
  q('chartFractalLevelsToggle')?.addEventListener('click',()=>{levels.setEnabled(!levels.isEnabled());sync();});
  q('chartFractalHistoryToggle')?.addEventListener('click',()=>{view.setHistory(!view.isHistoryOn());sync();});
  for(const id of ['chartCandlesToggle','chartFractalLevelsToggle','chartFractalHistoryToggle','chartControlsLink'])q(id)?.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation();});
  q('chartControlsLink')?.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();history.replaceState(null,'','#replayControls');q('replayControls')?.scrollIntoView({block:'start',behavior:'instant'});q('chartCandlesToggle')?.focus({preventScroll:true});});
  for(const [obj,name] of [[view,'setCandles'],[view,'setHistory'],[levels,'setEnabled']]){const base=obj[name];obj[name]=function(){const value=base.apply(this,arguments);sync();return value;};}
  if(typeof renderChart==='function'){const base=renderChart;renderChart=function(){const value=base.apply(this,arguments);sync();return value;};root.renderChart=renderChart;}
  document.addEventListener('click',e=>{if(e.target.closest?.('#candlesToggle,#fractalHistoryToggle,#fractalLevelsToggle,[data-daily-mode]'))sync();});
  root.OSDVisibleChartControls=Object.freeze({version:VERSION,sync});
  document.documentElement.dataset.osdRelease=VERSION;
  sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(globalThis);
