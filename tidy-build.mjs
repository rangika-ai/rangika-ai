import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import vm from 'node:vm';
import {unzipSync,zipSync} from 'fflate';
const VERSION='3.7.0',BASE_SHA='6ea8cba1a407f1ed71cd52597c566876a566c926e72b043c98c9e386772a29eb';
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile('tidy-seed-manifest.json','utf8'));
let archive;
if(process.env.OSD_LOCAL_SEED)archive=new Uint8Array(await readFile(process.env.OSD_LOCAL_SEED));
else{const r=await fetch('https://researchlab-nu.vercel.app/OSD_Research_Lab_Final.zip',{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Baseline app download failed '+r.status);archive=new Uint8Array(await r.arrayBuffer());}
const files=unzipSync(archive),base=files['source/toolbar-baseline-v3.6.3.html']||files['index.html'];
if(!base||sha(base)!==BASE_SHA)throw Error('Pinned v3.6.3 baseline checksum mismatch. Refusing to modify an unexpected release.');
await rm('public',{recursive:true,force:true});await mkdir('public/source',{recursive:true});
for(const [name,expected] of Object.entries(manifest.assets)){
 if(!files[name]||sha(files[name])!==expected)throw Error('Preserved asset checksum mismatch: '+name);
 await mkdir(path.dirname('public/'+name),{recursive:true});await writeFile('public/'+name,files[name]);
}
await writeFile('public/source/toolbar-baseline-v3.6.3.html',base);
let html=new TextDecoder().decode(base);const changes=[];
function cut(start,end,replacement,label){const a=html.indexOf(start),b=html.indexOf(end,a+start.length);if(a<0||b<0||html.indexOf(start,a+1)!==-1)throw Error('Expected unique edit anchor: '+label);html=html.slice(0,a)+replacement+html.slice(b);changes.push(label);}
// Replace the old block, rather than hiding old controls behind a new facade.
cut('        <div class="legend">','        <section class="daily-context-panel"',await readFile('tidy-toolbar.html','utf8')+'\n','Replace legend, forward-value dashboard and replay toolbar');
cut("  const anchor=document.getElementById('currentFibToggle');\n  if(anchor", "  const viewport=document.getElementById('chartViewport');",'','Remove duplicate fractal control factory and handlers');
cut("  const anchor=document.getElementById('currentFibToggle')?.closest('.fib-controls');", "  if(typeof HELP_CONTENT!=='undefined')HELP_CONTENT.structureView",'','Remove duplicate candle/history factory and handlers');
cut("  const viewport=q('chartViewport');\n  if(viewport){\n   const legend=document.createElement('div');legend.id='lineCategoryLegend';", "  if(typeof renderChart==='function'){const prior=renderChart;",'','Combine category legend with layer controls');
let old=0;
html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,s=>{if(s.includes('root.OSDVisibleChartControls')){old++;return '';}return s;});
if(old!==1)throw Error('Expected one obsolete visible-controls module');changes.push('Remove old redundant synchronization module');
html=html.replace(/<style id="osd-visible-chart-controls-style">[\s\S]*?<\/style>/,'');
html=html.replace(/document\.title='OSD Kelly Edge Lab[^']*'/g,"document.title='OSD Research Lab — v3.7.0 · Chart-first workspace'");
html=html.replaceAll('3.6.3',VERSION).replace(' · Category colours',' · Chart-first workspace');
html=html.replace('</head>','<style id="osd-chart-first-style">\n'+await readFile('tidy-toolbar.css','utf8')+'\n</style>\n</head>');
html=html.replace('</body>','<script>\n'+await readFile('tidy-toolbar.js','utf8')+'\n</script>\n</body>');
let scripts=0;for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!match[1].includes('src=')&&!/type="(?:application\/ld\+json|application\/json)"/.test(match[1])){new vm.Script(match[2]);scripts++;}}
const finalSHA256=sha(html);
await writeFile('public/index.html',html);
await writeFile('public/release.json',JSON.stringify({version:VERSION,name:'OSD Research Lab',features:['two-row-toolbar','inline-chart-settings','one-control-per-action','category-layer-switches','causal-fractal-history','hide-candles'],sha256:finalSHA256},null,2));
await writeFile('public/build-report.json',JSON.stringify({version:VERSION,baselineSHA256:BASE_SHA,finalSHA256,syntaxCheckedScripts:scripts,changes,preservedAssets:Object.keys(manifest.assets)},null,2));
if(process.env.OSD_RENDER_ONLY==='1'){console.log('RENDERED',finalSHA256);process.exit(0);}
execFileSync(process.execPath,['tidy-audit.mjs'],{stdio:'inherit'});
const audit=JSON.parse(await readFile('public/toolbar-audit.json','utf8'));if(!audit.pass)throw Error('Toolbar audit failed');
await writeFile('public/audit-summary.json',JSON.stringify({version:VERSION,pass:audit.pass,engineTests:audit.engines,browserTests:{passed:audit.passed,total:audit.total},spaceReduction:audit.spaceReduction,finalSHA256},null,2));
const zipFiles={};for(const name of [...Object.keys(manifest.assets),'index.html','release.json','audit-summary.json','build-report.json','toolbar-audit.json','source/toolbar-baseline-v3.6.3.html'])zipFiles[name]=new Uint8Array(await readFile('public/'+name));
zipFiles['README.txt']=new TextEncoder().encode('OSD Research Lab v3.7.0\nOpen index.html in a desktop browser.\nPrevious, Next and Hide/Show candles are always visible.\nLayers controls entire line categories; Chart settings contains current/history options and exact values. More contains rewind, voice and SVG export.\nThe source folder contains the checksum-pinned prior release for reproducible upgrades.\nNo new data processing or trading logic. Research only.\n');
const zip=zipSync(zipFiles,{level:6});for(const name of ['OSD_Research_Lab_Final.zip','OSD_Research_Lab_Exact.zip'])await writeFile('public/'+name,zip);
console.log('FULL APP BUILT',VERSION,finalSHA256);
