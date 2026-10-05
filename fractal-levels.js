/* OSD Research Lab: causal opposite-edge fractal levels. No future records are read. */
(function(root){
 'use strict';
 const VERSION='3.5-fractal-levels', PERIOD=1100;
 const empty=()=>({high:{confirmed:null,candidate:null},low:{confirmed:null,candidate:null}});
 function valid(r){return !!r&&Number.isFinite(r.high)&&Number.isFinite(r.low)&&r.high>=r.low;}
 function qualifies(records,origin,rightCount,side){
  if(origin<2)return false;
  const r=records[origin];if(!valid(r))return false;
  for(const j of [origin-2,origin-1,...Array.from({length:rightCount},(_,k)=>origin+k+1)]){
   const b=records[j];if(!valid(b))return false;
   if(side==='high'?r.high<=b.high:r.low>=b.low)return false;
  }
  return true;
 }
 function packet(records,i,side,confirmed){return {side,origin:i,knownAt:i+1,confirmedAt:confirmed?i+2:null,state:confirmed?'confirmed':'developing',price:side==='high'?records[i].low:records[i].high,extreme:side==='high'?records[i].high:records[i].low};}
 function compute(records,cursor){
  const result=empty();
  if(!records||!Number.isInteger(cursor)||cursor<0||cursor>=records.length)return result;
  for(let i=2;i+2<=cursor;i++)for(const side of ['high','low'])if(qualifies(records,i,2,side))result[side].confirmed=packet(records,i,side,true);
  const i=cursor-1;
  if(i>=2)for(const side of ['high','low'])if(qualifies(records,i,1,side))result[side].candidate=packet(records,i,side,false);
  return result;
 }
 function selfTest(){
  const cases=[],run=(name,test)=>{try{if(!test())throw new Error('Assertion failed');cases.push({name,pass:true});}catch(e){cases.push({name,pass:false,error:String(e.message||e)});}};
  const rows=(hs,ls)=>hs.map((high,i)=>({high,low:ls[i]}));
  const h=rows([8,9,14,12,11],[4,5,7,6,5]);
  const l=rows([12,11,8,10,11],[8,7,2,4,5]);
  const next=rows([8,9,14,12,11,13,18,16,15],[4,5,7,6,5,6,9,8,7]);
  run('No candidate on its own candle',()=>compute(h,2).high.candidate===null);
  run('High develops after first right candle',()=>compute(h,3).high.candidate?.origin===2);
  run('High line is the candidate LOW',()=>compute(h,3).high.candidate?.price===7);
  run('High not confirmed after one right candle',()=>compute(h,3).high.confirmed===null);
  run('High confirms after second right candle',()=>compute(h,4).high.confirmed?.origin===2&&compute(h,4).high.candidate===null);
  run('Confirmed high keeps the same price',()=>compute(h,4).high.confirmed?.price===7);
  run('Higher second candle invalidates high',()=>compute(rows([8,9,14,12,15],[4,5,7,6,5]),4).high.confirmed===null);
  run('Equal second high invalidates strict fractal',()=>compute(rows([8,9,14,12,14],[4,5,7,6,5]),4).high.confirmed===null);
  run('Equal first high never becomes candidate',()=>compute(rows([8,9,14,14,11],[4,5,7,6,5]),3).high.candidate===null);
  run('Low develops after first right candle',()=>compute(l,3).low.candidate?.origin===2);
  run('Low line is the candidate HIGH',()=>compute(l,3).low.candidate?.price===8);
  run('Low not confirmed after one right candle',()=>compute(l,3).low.confirmed===null);
  run('Low confirms after second right candle',()=>compute(l,4).low.confirmed?.origin===2);
  run('Lower second candle invalidates low',()=>compute(rows([12,11,8,10,11],[8,7,2,4,1]),4).low.confirmed===null);
  run('Equal second low invalidates strict fractal',()=>compute(rows([12,11,8,10,11],[8,7,2,4,2]),4).low.confirmed===null);
  run('Prior confirmed level survives new candidate',()=>compute(next,7).high.confirmed?.origin===2&&compute(next,7).high.candidate?.origin===6);
  run('New confirmation replaces same-type level',()=>compute(next,8).high.confirmed?.origin===6);
  run('Failed replacement preserves prior confirmed level',()=>{const a=next.map(x=>({...x}));a[8].high=19;return compute(a,8).high.confirmed?.origin===2&&compute(a,8).high.candidate===null;});
  const dual=rows([10,12,20,14,13],[8,7,1,6,5]);
  run('High and low candidates coexist independently',()=>compute(dual,3).high.candidate?.price===1&&compute(dual,3).low.candidate?.price===20);
  run('High and low confirmations coexist independently',()=>compute(dual,4).high.confirmed?.price===1&&compute(dual,4).low.confirmed?.price===20);
  run('Rewind restores developing state',()=>{compute(h,4);return compute(h,3).high.candidate?.state==='developing'&&compute(h,3).high.confirmed===null;});
  run('Empty or incomplete data is safe',()=>compute([],0).high.confirmed===null&&compute(h,0).high.candidate===null);
  run('No future numeric index is accessed',()=>{for(let end=0;end<next.length;end++){const guarded=new Proxy(next,{get(t,key){if(/^\d+$/.test(String(key))&&Number(key)>end)throw new Error('Future record read');return Reflect.get(t,key);}});compute(guarded,end);}return true;});
  run('Future-price edits cannot change current output',()=>{const a=next.map(x=>({...x}));const before=JSON.stringify(compute(a,4));for(let i=5;i<a.length;i++){a[i].high=10000+i;a[i].low=-10000-i;}return JSON.stringify(compute(a,4))===before;});
  return {version:VERSION,passed:cases.filter(x=>x.pass).length,total:cases.length,pass:cases.every(x=>x.pass),cases};
 }
 root.OSDFractalEngine=Object.freeze({compute,selfTest,version:VERSION});
 if(typeof document==='undefined')return;
 const KEY='osd.fractalOppositeEdges.v1';let enabled=true;
 try{enabled=localStorage.getItem(KEY)!=='off';}catch{}
 let memo={records:null,cursor:null,length:0,value:empty()};
 function snapshot(cursor){
  const rs=typeof state!=='undefined'?state.records:[];
  const end=cursor===undefined?(typeof state!=='undefined'?state.currentIndex:-1):cursor;
  if(memo.records!==rs||memo.cursor!==end||memo.length!==rs.length)memo={records:rs,cursor:end,length:rs.length,value:compute(rs,end)};
  return memo.value;
 }
 function active(cursor){const s=snapshot(cursor);return ['high','low'].flatMap(side=>[s[side].confirmed,s[side].candidate].filter(Boolean));}
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=v=>Number(v).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2});
 function svg(g){
  if(!enabled)return '';
  const levels=active(g.end),labels=[];
  let out='<g data-role="fractal-opposite-edge-levels" pointer-events="none">';
  for(const f of levels){
   const yy=g.y(f.price),xx=g.x(Math.max(g.start,f.origin)),dev=f.state==='developing',color=f.side==='high'?'#963f37':'#1e5a38';
   const name=f.side==='high'?'HF LOW':'LF HIGH';
   const origin=state.records[f.origin],stamp=typeof formatTimestamp==='function'?formatTimestamp(origin):String(f.origin);
   const title=`${f.side==='high'?'LOW of high-fractal candle':'HIGH of low-fractal candle'} ${number(f.price)} · ${f.state} · candle ${stamp} · available after candle +1${dev?' · candle +2 has not closed':' · confirmed at +2'}`;
   out+=`<g ${dev?'class="osd-fractal-provisional"':''} data-fractal-state="${f.state}" data-fractal-side="${f.side}"><title>${esc(title)}</title><line data-role="fractal-opposite-edge-line" data-origin="${f.origin}" data-known-at="${f.knownAt}" data-confirmed-at="${f.confirmedAt??''}" data-state="${f.state}" data-side="${f.side}" data-price="${f.price}" x1="${Math.max(g.m.l,xx)}" y1="${yy}" x2="${g.plotRight}" y2="${yy}" stroke="${color}" stroke-width="${dev?1.8:1.55}" ${dev?'stroke-dasharray="6 4"':''} vector-effect="non-scaling-stroke"/>`;
   let ly=yy-5;if(labels.some(p=>Math.abs(p-ly)<13))ly=yy+11;labels.push(ly);
   out+=`<text x="${g.plotRight-5}" y="${ly}" text-anchor="end" font-family="ui-monospace,monospace" font-size="8" font-weight="800" fill="${color}" stroke="#f7f6f0" stroke-width="3" paint-order="stroke">${name}${dev?' ?':''} ${number(f.price)}</text></g>`;
  }
  return out+'</g>';
 }
 function sync(){
  const button=document.getElementById('fractalLevelsToggle');
  if(button){button.textContent=`Fractal levels: ${enabled?'on':'off'}`;button.classList.toggle('active',enabled);button.setAttribute('aria-pressed',String(enabled));}
  document.documentElement.style.setProperty('--osd-fractal-phase',`-${Math.floor((document.timeline?.currentTime||performance.now())%PERIOD)}ms`);
  const strip=document.getElementById('fractalLevelReadout');if(!strip)return;
  strip.hidden=!enabled;if(!enabled)return;
  strip.replaceChildren();
  const all=active();
  if(!all.length){strip.textContent='Fractal levels · no qualifying structure revealed yet.';return;}
  for(const f of all){const span=document.createElement('span');span.style.color=f.side==='high'?'#963f37':'#1e5a38';span.textContent=`${f.side==='high'?'HF low':'LF high'} ${number(f.price)} · ${f.state}`;strip.appendChild(span);}
 }
 function dataReady(){return typeof state!=='undefined'&&!!state.records?.[state.currentIndex];}
 function setEnabled(value){enabled=!!value;try{localStorage.setItem(KEY,enabled?'on':'off');}catch{}if(dataReady()){if(typeof renderAll==='function')renderAll(false);else if(typeof renderChart==='function')renderChart(false);}sync();}
 root.OSDFractalLevels={version:VERSION,snapshot,svg,scaleValues:cursor=>enabled?active(cursor).map(f=>f.price):[],selfTest,setEnabled,isEnabled:()=>enabled};
 function bind(){
  if(document.getElementById('osd-fractal-level-style'))return;
  const style=document.createElement('style');style.id='osd-fractal-level-style';
  style.textContent=`
   @keyframes osdFractalLevelPulse{0%,100%{opacity:.28}50%{opacity:1}}
   .osd-fractal-provisional,[data-role="potential-fractal-high"],[data-role="potential-fractal-low"]{animation:osdFractalLevelPulse ${PERIOD}ms ease-in-out infinite!important;animation-delay:var(--osd-fractal-phase,0ms)!important;}
   [data-role="potential-fractal-overlay"] .potential-fractal-halo,[data-role="potential-fractal-overlay"] .potential-fractal-marker,[data-role="potential-fractal-overlay"] .potential-fractal-core{animation:none!important;}
   #fractalLevelReadout{display:flex;flex-wrap:wrap;gap:5px 14px;padding:7px 12px;border-top:1px solid var(--line-soft);font:700 9px/1.5 var(--mono);background:var(--paper-2);}
   #fractalLevelReadout[hidden]{display:none}
   @media(prefers-reduced-motion:reduce){.osd-fractal-provisional,[data-role="potential-fractal-high"],[data-role="potential-fractal-low"]{animation:none!important;opacity:.7}}
  `;document.head.appendChild(style);
  const anchor=document.getElementById('currentFibToggle');
  if(anchor&&!document.getElementById('fractalLevelsToggle')){
   const button=document.createElement('button');button.id='fractalLevelsToggle';button.type='button';button.className=anchor.className;button.title='High fractal → candle LOW. Low fractal → candle HIGH. Dashed and blinking after +1; solid after +2. The previous confirmed same-side line stays until a replacement confirms.';button.addEventListener('click',()=>setEnabled(!enabled));anchor.insertAdjacentElement('afterend',button);
  }
  const viewport=document.getElementById('chartViewport');
  if(viewport&&!document.getElementById('fractalLevelReadout')){const strip=document.createElement('div');strip.id='fractalLevelReadout';strip.setAttribute('aria-label','Active opposite-edge fractal levels');viewport.insertAdjacentElement('afterend',strip);}
  if(typeof renderChart==='function'){const base=renderChart;renderChart=function(){const value=base.apply(this,arguments);sync();return value;};root.renderChart=renderChart;}
  const baseTest=root.runSelfTest;
  if(typeof baseTest==='function'){
   root.runSelfTest=function(){const report=selfTest();if(!dataReady())return report.pass;const prior=baseTest.apply(this,arguments)!==false;const el=document.getElementById('selfTest');if(el){let value={};try{value=JSON.parse(el.textContent||'{}')}catch{}value.fractalOppositeEdgeStatus=report.pass?'pass':'fail';value.fractalLevelTests={passed:report.passed,total:report.total};value.fractalLevelVersion=VERSION;if(!report.pass)value.status='fail';el.textContent=JSON.stringify(value);}return prior&&report.pass;};
   try{runSelfTest=root.runSelfTest;}catch{}
  }
  if(typeof HELP_CONTENT!=='undefined')HELP_CONTENT.fractalLevels={title:'Developing fractal levels',body:'A high fractal marks the LOW of its candle. A low fractal marks the HIGH of its candle. After one supporting candle closes, symbol and level blink together. After the second supporting candle closes, a valid fractal becomes solid; an invalid candidate disappears. High and low structures are independent. A candidate does not remove an older confirmed same-side level: only a new confirmation replaces it.',formula:'Candidate known at i+1; confirmation known at i+2. Equal extremes are not accepted in this strict five-bar implementation.'};
  if(dataReady()){if(typeof renderAll==='function')renderAll(false);else if(typeof renderChart==='function')renderChart(false);root.runSelfTest?.();}
  sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(globalThis);
