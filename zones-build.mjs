import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import path from 'node:path';
import {zipSync,unzipSync} from 'fflate';
const VERSION='3.7.1',BASE='cd1edefb8d8ff0647d71b0c336e42733218ddd7e380b1a82b0c3f1a0bc1e8b47';
const sha=b=>createHash('sha256').update(b).digest('hex');
let zip;
if(process.env.OSD_LOCAL_SEED)zip=await readFile(process.env.OSD_LOCAL_SEED);
else{const r=await fetch('https://researchlab-nu.vercel.app/OSD_Research_Lab_Final.zip',{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Baseline download failed');zip=new Uint8Array(await r.arrayBuffer());}
const files=unzipSync(zip),base=files['source/zone-baseline-v3.7.0.html']||files['index.html'];
if(!base||sha(base)!==BASE)throw Error('Unexpected baseline: refusing to patch');
await rm('public',{recursive:true,force:true});await mkdir('public/source',{recursive:true});
const assets=JSON.parse(await readFile('tidy-seed-manifest.json','utf8')).assets;
for(const [name,hash] of Object.entries(assets)){if(!files[name]||sha(files[name])!==hash)throw Error('Asset mismatch: '+name);await mkdir(path.dirname('public/'+name),{recursive:true});await writeFile('public/'+name,files[name]);}
for(const name of ['source/toolbar-baseline-v3.6.3.html'])if(files[name])await writeFile('public/'+name,files[name]);
await writeFile('public/source/zone-baseline-v3.7.0.html',base);
let html=new TextDecoder().decode(base),anchor='  for(let k=0;k<=6;k++){const v=min+(max-min)*(k/6),yy=y(v);';
if(html.split(anchor).length!==2)throw Error('Expected unique H1 grid anchor');
html=html.replace(anchor,"  out+=(window.OSDFractalZones?.svg({start,end,step,x,y,m,plotRight,viewW,height})||'');\n"+anchor);
html=html.replaceAll('3.7.0',VERSION);
html=html.replace('</body>','<script>\n'+await readFile('fractal-zones.js','utf8')+'\n</script>\n<script>\n'+await readFile('floating-next.js','utf8')+'\n</script>\n</body>');
let scripts=0;for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!m[1].includes('src=')&&!/type="(?:application\/ld\+json|application\/json)"/.test(m[1])){new vm.Script(m[2]);scripts++;}}
const hash=sha(html);await writeFile('public/index.html',html);
await writeFile('public/release.json',JSON.stringify({version:VERSION,name:'OSD Research Lab',features:['two-row-toolbar','floating-next','active-fractal-zone','provisional-fractal-zone','optional-historical-zones','lighter-fractal-lines','one-colour-per-category'],sha256:hash},null,2));
await writeFile('public/build-report.json',JSON.stringify({version:VERSION,baselineSHA256:BASE,finalSHA256:hash,syntaxCheckedScripts:scripts,preservedAssets:Object.keys(assets)},null,2));
if(process.env.OSD_RENDER_ONLY==='1'){console.log('RENDERED',VERSION,hash);process.exit(0);}
execFileSync(process.execPath,['zones-audit.mjs'],{stdio:'inherit'});
const audit=JSON.parse(await readFile('public/zones-audit.json','utf8'));if(!audit.pass)throw Error('Zone / floating control audit failed');
await writeFile('public/audit-summary.json',JSON.stringify({version:VERSION,engineTests:audit.engines,browserTests:{passed:audit.passed,total:audit.total},pass:audit.pass,finalSHA256:hash},null,2));
const out={};
for(const n of [...Object.keys(assets),'index.html','source/zone-baseline-v3.7.0.html','source/toolbar-baseline-v3.6.3.html','release.json','build-report.json','zones-audit.json','audit-summary.json'])out[n]=new Uint8Array(await readFile('public/'+n));
out['README.txt']=new TextEncoder().encode('OSD Research Lab 3.7.1\nOpen index.html in a desktop browser. Next floats at the bottom edge when the toolbar leaves view, including narrow and split layouts. The original button and replay action are reused.\nChart settings > Fractal levels: Shade active zone On; Historical zones Off by default. History requires Historical levels On. Shading is between HF LOW and LF HIGH, starts only after both boundaries are known, and does not forecast direction. Provisional shading is lighter. The high and low boundary order may reverse; shading always uses their numeric minimum and maximum.\nBoth fractal lines remain violet but are lighter and thinner. Indicator prices, original data, scale calculations and journals are unchanged. Research only.\n');
const bytes=zipSync(out,{level:6});for(const n of ['OSD_Research_Lab_Final.zip','OSD_Research_Lab_Exact.zip'])await writeFile('public/'+n,bytes);
console.log('READY',VERSION,hash,JSON.stringify({browser:[audit.passed,audit.total],engines:audit.engines}));
