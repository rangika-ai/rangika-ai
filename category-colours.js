/* OSD Research Lab v3.6.3: colour identifies CATEGORY, never high/low direction. */
(function(root){
 'use strict';
 const VERSION='3.6.3';
 const palette=Object.freeze({
  previousDay:Object.freeze({colour:'#335f83',label:'PDH / PDL',name:'Slate blue'}),
  fractal:Object.freeze({colour:'#79518a',label:'HF LOW / LF HIGH',name:'Muted violet'}),
  pivot:Object.freeze({colour:'#89631d',label:'Daily pivots',name:'Ochre'}),
  fibonacci:Object.freeze({colour:'#0b7371',label:'Fibonacci',name:'Teal'})
 });
 if(typeof document==='undefined'){root.OSDCategoryColours={version:VERSION,palette};return;}
 const q=id=>document.getElementById(id);
 const HISTORY_OPACITY=.42;
 function apply(svg){
  if(!svg)return;
  for(const el of svg.querySelectorAll('[data-osd-category]')){
   const config=palette[el.dataset.osdCategory];if(!config||el.dataset.osdCategory==='fractal')continue;
   const tag=el.tagName.toLowerCase(),role=el.dataset.role||'',old=el.dataset.osdPhase==='history';
   if(tag==='text'){el.setAttribute('fill',config.colour);continue;}
   if(tag==='rect'&&/^(fib-hit-|pivot-touch-)/.test(role)){el.setAttribute('fill',config.colour);el.setAttribute('opacity',old?'.65':'1');continue;}
   // Paper halos and label backgrounds must stay neutral; recolour their borders only.
   if(el.getAttribute('stroke')==='#f7f6f0'&&tag==='line'){if(old)el.setAttribute('opacity','.42');continue;}
   el.setAttribute('stroke',config.colour);
   if(tag==='line'){
    el.setAttribute('opacity',old?String(HISTORY_OPACITY):'1');
    if(old)el.setAttribute('stroke-width','1.05');
    else el.removeAttribute('stroke-dasharray');
   }
  }
  const colour=palette.fractal.colour;
  for(const line of svg.querySelectorAll('[data-role="fractal-opposite-edge-line"],[data-role="fractal-history-line"]')){
   const old=line.dataset.role==='fractal-history-line';
   line.setAttribute('stroke',colour);line.setAttribute('stroke-width',old?'1.05':line.dataset.state==='developing'?'1.8':'2.15');
   line.setAttribute('opacity',old?String(HISTORY_OPACITY):'1');line.dataset.osdCategory='fractal';
   // Developing dash pattern and synchronized animation are left untouched.
   if(!old)line.parentElement.querySelectorAll('text').forEach(el=>el.setAttribute('fill',colour));
  }
  for(const side of ['high','low']){
   svg.querySelectorAll(`[data-role="fractal-${side}"]`).forEach(el=>el.setAttribute('fill',colour));
   svg.querySelectorAll(`[data-role="potential-fractal-${side}"] .potential-fractal-marker`).forEach(el=>el.setAttribute('stroke',colour));
   svg.querySelectorAll(`[data-role="potential-fractal-${side}"] .potential-fractal-core`).forEach(el=>el.setAttribute('fill',colour));
  }
 }
 function sync(){
  apply(q('priceChart'));
  q('fractalLevelReadout')?.querySelectorAll('span').forEach(el=>el.style.color=palette.fractal.colour);
  if(q('osdReleaseBadge'))q('osdReleaseBadge').textContent='v'+VERSION;
  document.title='OSD Research Lab — v'+VERSION+' · Category colours';
 }
 function bind(){
  if(q('osd-category-colour-style'))return;
  const style=document.createElement('style');style.id='osd-category-colour-style';
  style.textContent=`
   :root{--osd-category-day:${palette.previousDay.colour};--osd-category-fractal:${palette.fractal.colour};--osd-category-pivot:${palette.pivot.colour};--osd-category-fib:${palette.fibonacci.colour};}
   .chart-card .legend-line,.chart-card .legend-line.low{border-color:var(--osd-category-day);border-top-style:solid;}
   .chart-card .legend-dot{background:var(--osd-category-fractal);}
   .chart-card .legend-dot.potential{border-color:var(--osd-category-fractal);background:transparent;}
   .chart-card .legend-fib.upper,.chart-card .legend-fib.lower{border-color:var(--osd-category-fib);}
   .chart-card .legend-pivot{border-color:var(--osd-category-pivot);}
   #detailPDH,#detailPDL{color:var(--osd-category-day)!important;}
   #fibUpper,#fibLower,#detailFibUpper,#detailFibLower{color:var(--osd-category-fib)!important;}
   #pivotPValue,#pivotR1Value,#pivotS1Value,#detailPivotP,#detailPivotR1,#detailPivotS1,#detailPivotR2,#detailPivotS2{color:var(--osd-category-pivot)!important;}
   #lineCategoryLegend{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line-soft);background:var(--paper-2);font:700 9px/1.5 var(--mono);color:var(--muted);}
   #lineCategoryLegend .category-key{display:inline-flex;gap:6px;align-items:center;white-space:nowrap;}
   #lineCategoryLegend .category-key i{width:20px;border-top:2px solid currentColor;flex-shrink:0;}
   #lineCategoryLegend .category-state-key{font-weight:500;}
   @media(max-width:480px){#lineCategoryLegend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 10px;padding:7px 9px;}#lineCategoryLegend .category-state-key{grid-column:1/-1;}}
  `;document.head.appendChild(style);
  const viewport=q('chartViewport');
  if(viewport){
   const legend=document.createElement('div');legend.id='lineCategoryLegend';legend.setAttribute('role','group');legend.setAttribute('aria-label','Line categories: one colour per category');
   for(const [category,config] of Object.entries(palette)){
    const key=document.createElement('span');key.className='category-key';key.dataset.category=category;key.style.color=config.colour;key.title=config.name+' — '+config.label;
    const sample=document.createElement('i');sample.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=config.label;key.append(sample,label);legend.appendChild(key);
   }
   const note=document.createElement('span');note.className='category-state-key';note.textContent='Solid: current · Faint: history · Blinking dashed: developing fractal';legend.appendChild(note);viewport.insertAdjacentElement('beforebegin',legend);
  }
  if(typeof renderChart==='function'){const prior=renderChart;renderChart=function(){const result=prior.apply(this,arguments);sync();return result;};root.renderChart=renderChart;}
  if(typeof HELP_CONTENT!=='undefined'){
   HELP_CONTENT.chart={title:'Chart symbols and colours',body:'Colour identifies a category, not high/low direction. PDH and PDL share slate blue. HF LOW and LF HIGH share muted violet. Daily pivot P and every support/resistance line share ochre. All Fibonacci levels share teal. Labels identify individual levels; current lines are solid, historical segments thinner and faded, and developing fractals blink with dashed levels. Hiding candles does not change the data or price scale.',formula:'High fractal → candle LOW. Low fractal → candle HIGH. Candidate after +1 closed candle; confirmation or invalidation after +2.'};
   for(const key of ['fractalLevels','structureView','fibHistory','dailyPivots'])if(HELP_CONTENT[key])HELP_CONTENT[key].body+=' One colour per category: slate blue for PDH/PDL; muted violet for all fractal levels; ochre for all daily pivots; teal for all Fibonacci levels. History retains its category colour with reduced opacity.';
  }
  sync();
 }
 root.OSDCategoryColours=Object.freeze({version:VERSION,palette,apply,sync,historyOpacity:HISTORY_OPACITY});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(globalThis);
