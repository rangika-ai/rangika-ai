/* OSD Research Lab 3.6: price visibility and causal opposite-edge history. */
(function(root){
 'use strict';
 const VERSION='3.6.0-structure-view';
 const SIDES=['high','low'];
 function history(records,cursor){
  const result={high:[],low:[]};
  if(!records||!Number.isInteger(cursor)||cursor<0||cursor>=records.length)return result;
  for(let i=2;i+2<=cursor;i++){
   const r=records[i];
   if(!r||!Number.isFinite(r.high)||!Number.isFinite(r.low)||r.high<r.low)continue;
   for(const side of SIDES){
    let qualifies=true;
    for(const j of [i-2,i-1,i+1,i+2]){
     const b=records[j];
     if(!b||!Number.isFinite(b.high)||!Number.isFinite(b.low)||b.high<b.low||(side==='high'?r.high<=b.high:r.low>=b.low)){qualifies=false;break;}
    }
    if(!qualifies)continue;
    const series=result[side];
    // Close the prior segment only when its same-side replacement is KNOWN.
    if(series.length)series[series.length-1].until=i+2;
    series.push({side,origin:i,knownAt:i+1,confirmedAt:i+2,until:null,price:side==='high'?r.low:r.high});
   }
  }
  return result;
 }
 function archived(snapshot,start){return SIDES.flatMap(side=>snapshot[side].filter(f=>f.until!==null&&f.until>start));}
 function selfTest(){
  const tests=[],run=(name,fn)=>{try{if(!fn())throw new Error('Assertion failed');tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:String(e.message||e)});}};
  const rows=(h,l)=>h.map((high,i)=>({high,low:l[i]}));
  const h=rows([8,9,14,12,11,13,18,16,15],[4,5,7,6,5,6,9,8,7]);
  const l=rows([16,15,13,14,15,14,11,12,13],[12,11,6,8,9,7,2,4,5]);
  const both=rows([10,12,20,14,13],[8,7,1,6,5]);
  run('History empty at origin',()=>history(h,2).high.length===0);
  run('Unconfirmed candidate is not archived',()=>history(h,3).high.length===0);
  run('High confirmed at +2 with opposite edge',()=>history(h,4).high[0].price===7&&history(h,4).high[0].confirmedAt===4);
  run('Low confirmed at +2 with opposite edge',()=>history(l,4).low[0].price===13&&history(l,4).low[0].confirmedAt===4);
  run('Current segment has no fabricated future endpoint',()=>history(h,4).high[0].until===null);
  run('Candidate replacement does not end prior line',()=>history(h,7).high.length===1&&history(h,7).high[0].until===null);
  run('Old high segment ends at replacement confirmation',()=>history(h,8).high[0].until===8);
  run('New high level remains active',()=>history(h,8).high[1].price===9&&history(h,8).high[1].until===null);
  run('Low series follows its own confirmation times',()=>history(l,8).low.length===2&&history(l,8).low[0].until===8&&history(l,8).low[1].until===null);
  run('Invalidated replacement leaves no ghost segment',()=>{const r=h.map(b=>({...b}));r[8].high=19;const s=history(r,8);return s.high.length===1&&s.high[0].until===null;});
  run('Equal highs do not produce strict fractals',()=>{const r=h.slice(0,5).map(b=>({...b}));r[4].high=14;return history(r,4).high.length===0;});
  run('Equal lows do not produce strict fractals',()=>{const r=l.slice(0,5).map(b=>({...b}));r[4].low=6;return history(r,4).low.length===0;});
  run('Both sides may confirm on one origin',()=>history(both,4).high[0].price===1&&history(both,4).low[0].price===20);
  run('Opposite side does not end the active high',()=>history(h,8).high[0].until===8);
  run('Rewind reopens a segment whose replacement is not known',()=>history(h,7).high[0].until===null&&archived(history(h,7),0).length===0);
  run('Archive excludes the current active segment',()=>archived(history(h,8),0).every(f=>f.until!==null));
  run('Segment originating before viewport remains if it crosses viewport',()=>archived(history(h,8),5).some(f=>f.side==='high'&&f.origin===2));
  run('Expired off-screen segments are not rendered',()=>archived(history(h,8),8).length===0);
  run('Invalid cursors and empty data are safe',()=>[-1,9,1.5].every(c=>history(h,c).high.length===0)&&history([],0).high.length===0);
  run('Missing or malformed OHLC cannot confirm',()=>{const r=h.slice(0,5).map(b=>({...b}));r[3].high=NaN;return history(r,4).high.length===0;});
  run('No future numerical index is read',()=>{for(let end=0;end<h.length;end++){const guarded=new Proxy(h,{get(t,k){if(/^\d+$/.test(String(k))&&+k>end)throw new Error('Future access');return Reflect.get(t,k);}});history(guarded,end);}return true;});
  run('Future edits leave prior history unchanged',()=>{const r=h.map(b=>({...b})),before=JSON.stringify(history(r,4));for(let i=5;i<r.length;i++){r[i].high=1e6;r[i].low=-1e6;}return before===JSON.stringify(history(r,4));});
  run('History equals independently truncated replay data',()=>h.every((_,i)=>JSON.stringify(history(h,i))===JSON.stringify(history(h.slice(0,i+1),i))));
  run('Input records are not mutated',()=>{const before=JSON.stringify(h);history(h,8);return before===JSON.stringify(h);});
  return {version:VERSION,passed:tests.filter(t=>t.pass).length,total:tests.length,pass:tests.every(t=>t.pass),tests};
 }
 root.OSDStructureEngine=Object.freeze({history,archived,selfTest,version:VERSION});
 if(typeof document==='undefined')return;
 const KEYS={candles:'osd.structure.candles.v1',history:'osd.structure.history.v1'};
 const read=(key,fallback)=>{try{const v=localStorage.getItem(key);return v===null?fallback:v==='on';}catch{return fallback;}};
 const save=(key,value)=>{try{localStorage.setItem(key,value?'on':'off');}catch{}};
 let candlesOn=read(KEYS.candles,true),historyOn=read(KEYS.history,true);
 let cache={records:null,cursor:null,length:0,value:{high:[],low:[]}};
 function snapshot(cursor){
  const records=typeof state!=='undefined'?state.records:[],end=cursor??(typeof state!=='undefined'?state.currentIndex:-1);
  if(cache.records!==records||cache.cursor!==end||cache.length!==records.length)cache={records,cursor:end,length:records.length,value:history(records,end)};
  return cache.value;
 }
 const ready=()=>typeof state!=='undefined'&&!!state.records?.[state.currentIndex];
 function visibleStart(cursor){
  const width=Math.max(320,Math.floor(document.getElementById('chartViewport')?.clientWidth||940));
  const requested=Math.max(8,Number(state.contextBars)||18),cap=width<480?8:width<650?10:width<820?14:requested;
  return Math.max(0,cursor-Math.min(requested,cap,cursor+1)+1);
 }
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function historicalSvg(g){
  if(!historyOn||!root.OSDFractalLevels?.isEnabled())return '';
  const segments=archived(snapshot(g.end),g.start);
  let out='<g data-role="fractal-history-levels">';
  for(const f of segments){
   const x1=Math.max(g.m.l,g.x(Math.max(g.start,f.origin))),x2=Math.min(g.plotRight,g.x(f.until)),y=g.y(f.price);
   if(x2<=x1)continue;
   const color=f.side==='high'?'#963f37':'#1e5a38',label=f.side==='high'?'HF LOW':'LF HIGH';
   const stamp=typeof formatTimestamp==='function'?formatTimestamp(state.records[f.origin]):f.origin;
   const endStamp=typeof formatTimestamp==='function'?formatTimestamp(state.records[f.until]):f.until;
   out+=`<line data-role="fractal-history-line" data-side="${f.side}" data-origin="${f.origin}" data-known-at="${f.knownAt}" data-confirmed-at="${f.confirmedAt}" data-until="${f.until}" data-price="${f.price}" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="1.35" opacity=".48" vector-effect="non-scaling-stroke"><title>${esc(`${label} ${Number(f.price).toFixed(2)} · confirmed historical level · origin ${stamp} · replaced at ${endStamp}`)}</title></line>`;
  }
  return out+'</g>';
 }
 function sync(){
  const chart=document.getElementById('priceChart');
  if(chart){
   chart.dataset.candlesVisible=String(candlesOn);
   // Keep these nodes: candidate symbols read their geometry. Inline visibility
   // also survives the application's standalone SVG export.
   chart.querySelectorAll('[data-role="price-bar"],[data-role="close-tick"]').forEach(el=>{
    if(candlesOn){el.style.removeProperty('visibility');el.style.removeProperty('pointer-events');el.removeAttribute('aria-hidden');}
    else{el.style.visibility='hidden';el.style.pointerEvents='none';el.setAttribute('aria-hidden','true');}
   });
  }
  for(const [id,value] of [['candlesToggle',candlesOn],['fractalHistoryToggle',historyOn]]){
   const button=document.getElementById(id);if(!button)continue;
   button.querySelector('.control-value').textContent=value?'On':'Off';
   button.classList.toggle('active',value);button.setAttribute('aria-pressed',String(value));
  }
  const h=document.getElementById('fractalHistoryToggle');
  if(h){h.disabled=!root.OSDFractalLevels?.isEnabled();h.title=h.disabled?'Enable Fractal levels to display history. Your history preference is retained.':'Keep earlier HF LOW and LF HIGH segments. A segment ends only when the next same-type fractal confirms.';}
 }
 function setCandles(value){candlesOn=!!value;save(KEYS.candles,candlesOn);sync();}
 function setHistory(value){historyOn=!!value;save(KEYS.history,historyOn);if(ready()&&typeof renderChart==='function')renderChart(false);sync();}
 root.OSDStructureView={version:VERSION,snapshot,selfTest,isCandlesOn:()=>candlesOn,isHistoryOn:()=>historyOn,setCandles,setHistory,sync};
 function bind(){
  if(document.getElementById('osd-structure-view-style'))return;
  const levels=root.OSDFractalLevels;if(!levels)throw new Error('Fractal level module must load before structure view.');
  const baseSvg=levels.svg,baseScale=levels.scaleValues;
  levels.svg=function(g){return historicalSvg(g)+baseSvg(g);};
  levels.scaleValues=function(cursor){const values=baseScale(cursor);if(historyOn&&levels.isEnabled()&&ready())values.push(...archived(snapshot(cursor),visibleStart(cursor)).map(f=>f.price));return values;};
  const style=document.createElement('style');style.id='osd-structure-view-style';
  style.textContent=`
   .forward-value-stack .fib-controls.osd-structure-controls{grid-template-columns:repeat(2,minmax(0,1fr)) 44px;grid-template-areas:"candles archive help";margin-top:5px;}
   .osd-structure-controls #candlesToggle{grid-area:candles;}
   .osd-structure-controls #fractalHistoryToggle{grid-area:archive;}
   .osd-structure-controls .fib-help-control{grid-area:help;}
   .osd-structure-controls button{touch-action:manipulation;}
   .osd-structure-controls button:focus:not(:focus-visible){outline:none;}
   .osd-structure-controls button:focus-visible{outline:2px solid var(--green);outline-offset:2px;}
   .osd-structure-controls button:disabled{cursor:not-allowed;opacity:.5;}
  `;document.head.appendChild(style);
  const anchor=document.getElementById('currentFibToggle')?.closest('.fib-controls');
  if(anchor){
   const group=document.createElement('div');group.className='fib-controls osd-structure-controls';group.setAttribute('role','group');group.setAttribute('aria-label','Structure view controls');
   function button(id,label,onClick,title){
    const el=document.createElement('button');el.id=id;el.type='button';el.className='fib-control-box';el.dataset.sound='toggle';el.setAttribute('aria-label',label);el.setAttribute('aria-controls','priceChart');el.title=title;
    const name=document.createElement('span');name.className='control-label';name.textContent=label;
    const value=document.createElement('b');value.className='control-value';el.append(name,value);
    el.addEventListener('click',onClick);el.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation();});group.appendChild(el);
   }
   button('candlesToggle','Candles',()=>setCandles(!candlesOn),'Show or hide H1 price bars and close ticks. Fractals, indicators, price scale, replay and measurements remain unchanged.');
   button('fractalHistoryToggle','Fractal history',()=>setHistory(!historyOn),'Keep earlier confirmed HF LOW and LF HIGH segments.');
   const help=document.createElement('button');help.type='button';help.className='btn icon-btn fib-help-control';help.dataset.info='structureView';help.dataset.sound='click';help.setAttribute('aria-label','Explain structure-only view and fractal history');help.textContent='?';group.appendChild(help);
   anchor.insertAdjacentElement('afterend',group);
  }
  if(typeof HELP_CONTENT!=='undefined')HELP_CONTENT.structureView={title:'Structure-only view',body:'Candles Off hides H1 price bars and close ticks only. Fractal symbols, pivots, Fibonacci and other enabled research lines remain at the same coordinates. Fractal History keeps earlier confirmed HF LOW and LF HIGH segments in a lighter tone. Each old segment ends when the next same-type fractal confirms; a developing or failed candidate does not end it. History appears within the current chart window and rewinds causally. Fractal Levels is the master visibility switch; D1 context remains independently available.',formula:'HF LOW = low of a high-fractal candle. LF HIGH = high of a low-fractal candle. Candidate known at +1; confirmed at +2. Hiding price does not change the data or calculations.'};
  if(typeof renderChart==='function'){const base=renderChart;renderChart=function(){const result=base.apply(this,arguments);sync();return result;};root.renderChart=renderChart;}
  const baseTest=root.runSelfTest;
  if(typeof baseTest==='function'){
   root.runSelfTest=function(){const previous=baseTest.apply(this,arguments)!==false,report=selfTest(),el=document.getElementById('selfTest');if(el){let data={};try{data=JSON.parse(el.textContent||'{}');}catch{}data.structureViewStatus=report.pass?'pass':'fail';data.structureViewVersion=VERSION;data.structureHistoryTests={passed:report.passed,total:report.total};if(!report.pass)data.status='fail';el.textContent=JSON.stringify(data);}return previous&&report.pass;};
   try{runSelfTest=root.runSelfTest;}catch{}
  }
  if(ready()){renderChart(false);root.runSelfTest?.();}sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(globalThis);
