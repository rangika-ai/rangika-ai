/* 3.7.1: the same Next button docks to the viewport when its toolbar scrolls away. */
(function(root){
 'use strict';if(typeof document==='undefined')return;
 function bind(){
  const button=document.getElementById('nextBtn');if(!button||root.OSDFloatingNext)return;
  const slot=document.createElement('span');slot.id='nextButtonSlot';button.before(slot);slot.appendChild(button);
  const dock=document.createElement('div');dock.id='floatingNextDock';dock.hidden=true;dock.setAttribute('aria-label','Floating replay control');document.body.appendChild(dock);
  const style=document.createElement('style');style.id='osd-floating-next-style';style.textContent=`
   #nextButtonSlot{display:inline-flex;align-items:stretch;min-width:78px;min-height:36px;flex-shrink:0;}
   #nextButtonSlot>#nextBtn{width:100%!important;}
   #floatingNextDock{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:var(--osd-next-bottom,14px);z-index:900;padding:5px;background:var(--paper-2,#f7f6f0);border:1px solid var(--line-soft,#aaaba4);box-shadow:2px 3px 0 rgba(21,22,19,.15);}
   #floatingNextDock[hidden]{display:none!important;}
   #floatingNextDock>#nextBtn{min-width:98px;min-height:44px;border:1px solid var(--ink,#171815);border-radius:0;background:var(--ink,#171815);color:var(--paper-2,#f7f6f0);padding:11px 18px;font:800 12px/1.3 var(--mono,monospace);letter-spacing:.025em;cursor:pointer;touch-action:manipulation;}
   #floatingNextDock>#nextBtn:hover:not(:disabled){background:#30332c;}
   #floatingNextDock>#nextBtn:disabled{opacity:.45;cursor:not-allowed;}
   #floatingNextDock>#nextBtn:focus-visible{outline:2px solid var(--green,#276646);outline-offset:4px;}
   #floatingNextDock>#nextBtn:focus:not(:focus-visible){outline:none;}
   html{scroll-padding-bottom:calc(82px + var(--osd-next-bottom,14px));}
   @media(max-width:700px){#nextButtonSlot{min-height:44px;flex:1;}}
   @media print{#floatingNextDock{display:none!important;}}
  `;document.head.appendChild(style);
  let queued=false,floating=false;
  function visible(el){if(!el||!el.getClientRects().length)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';}
  function update(){
   queued=false;const r=slot.getBoundingClientRect(),v=root.visualViewport,top=v?.offsetTop||0,height=v?.height||innerHeight,left=v?.offsetLeft||0,width=v?.width||innerWidth;
   const inView=r.top>=top+4&&r.bottom<=top+height-8&&r.left>=left&&r.right<=left+width;
   const card=document.querySelector('.chart-card'),cr=card?.getBoundingClientRect();
   const blocked=[...document.querySelectorAll('.modal-backdrop.open,.milestone-overlay.show,#infoPopover.open,dialog[open],[aria-modal="true"]')].some(visible);
   const input=document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
   const use=!inView&&cr&&cr.top<top+height&&cr.bottom>top&&!blocked&&!input;
   const bar=document.querySelector('.mobile-entry-dock');let bottom=14;
   if(visible(bar)){const b=bar.getBoundingClientRect();if(b.top<top+height&&b.bottom>top+height-4)bottom+=top+height-b.top;}
   const toast=document.querySelector('.toast.show');if(visible(toast)){const t=toast.getBoundingClientRect();bottom=Math.max(bottom,top+height-t.top+10);}
   bottom=Math.min(Math.max(14,bottom),Math.max(14,height-70));
   dock.style.bottom=`${bottom+Math.max(0,innerHeight-top-height)}px`;dock.style.right=`${14+Math.max(0,innerWidth-left-width)}px`;
   document.documentElement.style.setProperty('--osd-next-bottom',bottom+'px');
   if(!!use!==floating){const focused=document.activeElement===button;floating=!!use;
    if(floating){const b=button.getBoundingClientRect();slot.style.width=b.width+'px';slot.style.height=b.height+'px';dock.hidden=false;dock.appendChild(button);button.dataset.floating='true';}
    else{slot.appendChild(button);dock.hidden=true;delete button.dataset.floating;}
    if(focused)button.focus({preventScroll:true});
   }
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
  button.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation();});
  root.addEventListener('scroll',schedule,{passive:true});root.addEventListener('resize',schedule,{passive:true});
  root.visualViewport?.addEventListener('resize',schedule);root.visualViewport?.addEventListener('scroll',schedule);
  document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);document.addEventListener('click',schedule);
  for(const e of document.querySelectorAll('.modal-backdrop,.milestone-overlay,#infoPopover,.mobile-entry-dock,.toast'))new MutationObserver(schedule).observe(e,{attributes:true,attributeFilter:['class','hidden','open']});
  new ResizeObserver(schedule).observe(slot);
  // Layout changes can move the toolbar without a scroll or slot-size event.
  new IntersectionObserver(schedule,{threshold:[0,1]}).observe(slot);
  const chartCard=document.querySelector('.chart-card');if(chartCard)new ResizeObserver(schedule).observe(chartCard);
  const prior=renderAll;renderAll=function(){const result=prior.apply(this,arguments);schedule();return result;};root.renderAll=renderAll;
  root.OSDFloatingNext=Object.freeze({update,schedule,isFloating:()=>floating});schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(globalThis);
