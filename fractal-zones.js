/* 3.7.1: causal paired fractal zones. Prices and the existing replay engine are unchanged. */
(function(root){
 'use strict';
 const VERSION='3.7.1';
 function pair(high,low,from,state='confirmed'){
  if(!high||!low||!Number.isFinite(high.price)||!Number.isFinite(low.price))return null;
  return {high,low,lower:Math.min(high.price,low.price),upper:Math.max(high.price,low.price),from,until:null,state};
 }
 function compute(records,cursor){
  const out={confirmed:null,provisional:null,history:[]};
  if(!records||!Number.isInteger(cursor)||cursor<0||cursor>=records.length)return out;
  const history=root.OSDStructureEngine.history(records,cursor);
  const events=[...history.high,...history.low].sort((a,b)=>a.confirmedAt-b.confirmedAt);
  let h=null,l=null,active=null;
  for(let j=0;j<events.length;){
   const at=events[j].confirmedAt;
   do{const e=events[j++];if(e.side==='high')h=e;else l=e;}while(j<events.length&&events[j].confirmedAt===at);
   const next=pair(h,l,at);
   if(next){if(active)out.history.push({...active,until:at});active=next;}
  }
  out.confirmed=active;
  const s=root.OSDFractalEngine.compute(records,cursor),hc=s.high.candidate,lc=s.low.candidate;
  if(hc||lc){const a=hc||s.high.confirmed,b=lc||s.low.confirmed;out.provisional=pair(a,b,Math.max(a?.confirmedAt??a?.knownAt??0,b?.confirmedAt??b?.knownAt??0),'developing');}
  return out;
 }
 root.OSDFractalZoneEngine=Object.freeze({version:VERSION,compute});
 if(typeof document==='undefined')return;
 const KEY='osd.fractalZones.v1',COLOUR='#94749f',q=id=>document.getElementById(id);
 let settings={show:true,history:false};
 try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');for(const k of ['show','history'])if(typeof x[k]==='boolean')settings[k]=x[k];}catch{}
 let cache={records:null,cursor:-1,length:0,result:null};
 function snapshot(){const rows=typeof state==='undefined'?[]:state.records,cursor=typeof state==='undefined'?-1:state.currentIndex;
  if(cache.records!==rows||cache.cursor!==cursor||cache.length!==rows.length)cache={records:rows,cursor,length:rows.length,result:compute(rows,cursor)};
  return cache.result;
 }
 const enabled=()=>!!root.OSDFractalLevels?.isEnabled();
 function svg(g){
  if(!settings.show||!enabled())return '';
  const s=snapshot();if(!s)return '';
  const bands=[];
  if(settings.history&&root.OSDStructureView?.isHistoryOn())bands.push(...s.history.filter(z=>z.until>=g.start).map(z=>({...z,state:'history'})));
  if(s.confirmed)bands.push({...s.confirmed,until:s.provisional?s.provisional.from:null});
  if(s.provisional)bands.push(s.provisional);
  let out='<g data-role="fractal-zones" pointer-events="none" aria-label="Area between HF LOW and LF HIGH">';
  for(const z of bands){
   const x1=Math.max(g.m.l,g.x(z.from)+g.step*.5),x2=z.until==null?g.plotRight:Math.min(g.plotRight,g.x(z.until)+g.step*.5);
   const top=Math.max(g.m.t,Math.min(g.y(z.lower),g.y(z.upper))),bottom=Math.min(g.height-g.m.b,Math.max(g.y(z.lower),g.y(z.upper)));
   if(x2<=x1||bottom<=top)continue;
   const opacity=z.state==='history'?.035:z.state==='developing'?.055:.10;
   out+=`<rect data-role="fractal-zone" data-state="${z.state}" data-from="${z.from}" data-until="${z.until??''}" data-low="${z.lower}" data-high="${z.upper}" data-high-origin="${z.high.origin}" data-low-origin="${z.low.origin}" x="${x1}" y="${top}" width="${x2-x1}" height="${bottom-top}" fill="${COLOUR}" fill-opacity="${opacity}" stroke="none"><title>${z.state} fractal zone: ${z.lower.toFixed(2)} to ${z.upper.toFixed(2)}. Available after bar ${z.from}; shaded forward as reference, not a price forecast.</title></rect>`;
  }
  return out+'</g>';
 }
 function set(key,value){if(!Object.hasOwn(settings,key))return;settings[key]=!!value;try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}if(typeof renderChart==='function')renderChart(false);sync();}
 function sync(){
  const chart=q('priceChart');
  if(chart)for(const line of chart.querySelectorAll('[data-role="fractal-opposite-edge-line"],[data-role="fractal-history-line"]')){
   const old=line.dataset.role==='fractal-history-line';line.setAttribute('stroke',COLOUR);line.setAttribute('stroke-width',old?'1':line.dataset.state==='developing'?'1.5':'1.65');line.setAttribute('opacity',old?'.28':'.82');
  }
  for(const [id,key] of [['fractalZoneToggle','show'],['fractalZoneHistoryToggle','history']]){
   const b=q(id);if(!b)continue;const on=settings[key];b.setAttribute('aria-pressed',String(on));b.querySelector('.control-value').textContent=on?'On':'Off';b.disabled=!enabled()||(key==='history'&&(!settings.show||!root.OSDStructureView?.isHistoryOn()));
  }
  const note=q('fractalZoneStatus');if(!note)return;
  if(!enabled()||!settings.show){note.textContent='Zone shading is hidden. Preferences are retained.';return;}
  const s=snapshot(),z=s?.provisional||s?.confirmed;
  if(!z){note.textContent='Waiting for both HF LOW and LF HIGH boundaries.';return;}
  const close=state.records[state.currentIndex]?.close;
  const location=close>z.upper?'above':close<z.lower?'below':'inside',distance=location==='above'?close-z.upper:location==='below'?z.lower-close:0;
  note.textContent=`${z.state==='developing'?'Developing':'Confirmed'} zone ${z.lower.toFixed(2)}–${z.upper.toFixed(2)} · close ${location}${distance?' by '+distance.toFixed(2)+' pts':''}.`;
 }
 function bind(){
  if(q('fractalZoneToggle'))return;
  const anchor=q('fractalHistoryToggle');if(!anchor)return;
  const box=document.createElement('div');box.className='osd-zone-settings';
  box.innerHTML='<button class="osd-setting-toggle" id="fractalZoneToggle" type="button" data-sound="toggle" aria-pressed="true" aria-controls="priceChart"><span class="control-label">Shade active zone</span><b class="control-value">On</b></button><button class="osd-setting-toggle" id="fractalZoneHistoryToggle" type="button" data-sound="toggle" aria-pressed="false" aria-controls="priceChart"><span class="control-label">Historical zones</span><b class="control-value">Off</b></button><p id="fractalZoneStatus"></p><p class="osd-zone-help">Shading begins only when both boundaries are known. A lighter band is provisional; failed candidates leave no historical zone. Historical zones require Historical levels On.</p>';
  anchor.insertAdjacentElement('afterend',box);
  q('fractalZoneToggle').addEventListener('click',()=>set('show',!settings.show));q('fractalZoneHistoryToggle').addEventListener('click',()=>set('history',!settings.history));
  for(const b of box.querySelectorAll('button'))b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation();});
  const prior=renderChart;renderChart=function(){const result=prior.apply(this,arguments);sync();return result;};root.renderChart=renderChart;
  document.addEventListener('click',e=>{if(e.target.closest?.('#fractalHistoryToggle,#fractalLevelsToggle'))sync();});
  if(typeof HELP_CONTENT!=='undefined')HELP_CONTENT.chart.body+=' A subtle violet band shows the area between HF LOW and LF HIGH. It begins when both boundaries are known; a developing preview is lighter. Historical zones are optional. The band is context, not a prediction.';
  if(typeof state!=='undefined'&&state.records.length)renderChart(false);sync();
 }
 root.OSDFractalZones=Object.freeze({version:VERSION,svg,sync,snapshot,set,getSettings:()=>({...settings}),colour:COLOUR});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(globalThis);
