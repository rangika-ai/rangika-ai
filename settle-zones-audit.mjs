/* Test-only readiness correction: retain every assertion, wait for the state under test. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
let s=await readFile('zones-audit.mjs','utf8');
const digest=x=>createHash('sha1').update('blob '+Buffer.byteLength(x)+'\0'+x).digest('hex');
if(digest(s)!=='296e49bf2b93db1387a6558fc8b996438d4968df'){
 if(digest(s)!=='304db87c9c06e249070d8f42c94cb2196f547427')throw Error('Audit source changed: reconcile readiness patch before release');
 const replace=(a,b)=>{if(s.split(a).length!==2)throw Error('Expected unique audit anchor: '+a);s=s.replace(a,b);};
 replace("window.scrollTo(0,document.getElementById('nextButtonSlot').getBoundingClientRect().top+scrollY-50)","window.scrollTo({top:document.getElementById('nextButtonSlot').getBoundingClientRect().top+scrollY-50,behavior:'instant'})");
 replace("window.scrollTo(0,document.getElementById('chartViewport').getBoundingClientRect().top+scrollY-20)","window.scrollTo({top:document.getElementById('chartViewport').getBoundingClientRect().top+scrollY-20,behavior:'instant'})");
 replace('  check(`Next remains in toolbar when visible at ${width}px`,',"  await p.waitForFunction(()=>document.getElementById('nextBtn').parentElement.id==='nextButtonSlot',null,{timeout:5000});\n  check(`Next remains in toolbar when visible at ${width}px`,");
 replace('  check(`Floating Next inside viewport at ${width}x${height}`,',"  await p.waitForFunction(()=>{const b=document.getElementById('nextBtn'),r=b.getBoundingClientRect();return b.parentElement.id==='floatingNextDock'&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===b;},null,{timeout:5000});\n  check(`Floating Next inside viewport at ${width}x${height}`,");
 replace("document.querySelectorAll('.modal-backdrop.open').forEach(e=>e.classList.remove('open'));","document.querySelectorAll('.modal-backdrop.open').forEach(e=>closeModal(e.id));");
 if(digest(s)!=='296e49bf2b93db1387a6558fc8b996438d4968df')throw Error('Audit readiness patch digest mismatch');
 await writeFile('zones-audit.mjs',s);
}
