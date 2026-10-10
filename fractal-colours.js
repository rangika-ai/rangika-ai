/* OSD Research Lab 3.6.2. Presentation only; no changes to prices or replay state. */
(function(root){
 'use strict';
 const VERSION='3.6.2';
 const palette=Object.freeze({
  high:Object.freeze({colour:'#79518a',label:'HF LOW',description:'Low of high-fractal candle'}),
  low:Object.freeze({colour:'#0b7371',label:'LF HIGH',description:'High of low-fractal candle'}),
  currentWidth:2.15,candidateWidth:1.8,historyWidth:1.05,historyOpacity:0.42
 });
 if(typeof document==='undefined'){root.OSDFractalColours={version:VERSION,palette};return;}
 const q=id=>document.getElementById(id);
 function sync(){
  const svg=q('priceChart');
  if(svg){
   for(const line of svg.querySelectorAll('[data-role="fractal-opposite-edge-line"],[data-role="fractal-history-line"]')){
    const series=palette[line.dataset.side];if(!series)continue;
    const old=line.dataset.role==='fractal-history-line';
    line.setAttribute('stroke',series.colour);
    line.setAttribute('stroke-width',String(old?palette.historyWidth:line.dataset.state==='developing'?palette.candidateWidth:palette.currentWidth));
    line.setAttribute('opacity',String(old?palette.historyOpacity:1));
    // Keep the existing solid / provisional dashed distinction and pulse timing.
    if(!old)for(const label of line.parentElement.querySelectorAll('text'))label.setAttribute('fill',series.colour);
   }
   // Match the originating symbols to their lines without moving their geometry.
   for(const side of ['high','low']){
    const colour=palette[side].colour;
    svg.querySelectorAll(`[data-role="fractal-${side}"]`).forEach(el=>el.setAttribute('fill',colour));
    svg.querySelectorAll(`[data-role="potential-fractal-${side}"] .potential-fractal-marker`).forEach(el=>el.setAttribute('stroke',colour));
    svg.querySelectorAll(`[data-role="potential-fractal-${side}"] .potential-fractal-core`).forEach(el=>el.setAttribute('fill',colour));
   }
  }
  q('fractalLevelReadout')?.querySelectorAll('span').forEach(el=>{
   const side=/^HF low\b/.test(el.textContent)?'high':/^LF high\b/.test(el.textContent)?'low':null;
   if(side)el.style.color=palette[side].colour;
  });
  const legend=q('fractalColourLegend');
  if(legend)legend.hidden=!root.OSDFractalLevels?.isEnabled();
  if(q('osdReleaseBadge'))q('osdReleaseBadge').textContent='v'+VERSION;
  document.title='OSD Research Lab — v'+VERSION+' · Structure view';
 }
 function bind(){
  if(q('osd-fractal-colour-style'))return;
  const style=document.createElement('style');style.id='osd-fractal-colour-style';
  style.textContent=`
   #fractalColourLegend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:8px 12px;border-bottom:1px solid var(--line-soft);background:var(--paper-2);font:700 9px/1.5 var(--mono);color:var(--muted);}
   #fractalColourLegend[hidden]{display:none;}
   #fractalColourLegend .fractal-key{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
   #fractalColourLegend .fractal-key i{display:inline-block;width:21px;border-top:2px solid currentColor;flex-shrink:0;}
   #fractalColourLegend .fractal-key-note{font-weight:500;}
   @media(max-width:480px){#fractalColourLegend{gap:5px 14px;padding:7px 9px;}#fractalColourLegend .fractal-key-note{flex-basis:100%;}}
  `;document.head.appendChild(style);
  const viewport=q('chartViewport');
  if(viewport){
   const legend=document.createElement('div');legend.id='fractalColourLegend';legend.setAttribute('role','group');legend.setAttribute('aria-label','Fractal line colour legend');
   for(const side of ['high','low']){
    const key=document.createElement('span');key.className='fractal-key';key.dataset.side=side;key.style.color=palette[side].colour;key.title=palette[side].description;
    const sample=document.createElement('i');sample.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.textContent=palette[side].label+' · '+(side==='high'?'violet':'teal');key.append(sample,label);legend.appendChild(key);
   }
   const note=document.createElement('span');note.className='fractal-key-note';note.textContent='Bold: current · Faint: history · Blinking dashed: developing';legend.appendChild(note);
   viewport.insertAdjacentElement('beforebegin',legend);
  }
  if(typeof renderChart==='function'){
   const prior=renderChart;
   renderChart=function(){const result=prior.apply(this,arguments);sync();return result;};
   root.renderChart=renderChart;
  }
  if(typeof HELP_CONTENT!=='undefined'){
   for(const key of ['fractalLevels','structureView'])if(HELP_CONTENT[key])HELP_CONTENT[key].body+=' HF LOW uses muted violet; LF HIGH uses teal. Current levels are stronger and history is thinner and lighter. Colour identifies the series, not a buy or sell instruction.';
  }
  sync();
 }
 root.OSDFractalColours=Object.freeze({version:VERSION,palette,sync});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(globalThis);
