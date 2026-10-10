import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {zipSync} from 'fflate';
import path from 'node:path';
const VERSION='3.6.2';
// The original full application and previous UI upgrades remain the baseline.
if(process.env.OSD_REUSE_COLOUR_BASE!=='1'){
 await import('./final-build.mjs');
 await writeFile('public/colour-baseline.html',await readFile('public/index.html'));
}
let html=await readFile('public/colour-baseline.html','utf8');
if(!html.includes('chartCandlesToggle')||!html.includes('OSDStructureEngine')||html.includes('osd-fractal-colour-style'))throw Error('Unexpected baseline for colour release');
const baselineSHA256=createHash('sha256').update(html).digest('hex');
html=html.replaceAll('3.6.1',VERSION).replace('</body>','<script>\n'+await readFile('fractal-colours.js','utf8')+'\n</script>\n</body>');
await writeFile('public/index.html',html);
const finalSHA256=createHash('sha256').update(html).digest('hex');
const report=JSON.parse(await readFile('public/build-report.json','utf8'));
Object.assign(report,{appVersion:VERSION,colourBaselineSHA256:baselineSHA256,patchedBytes:Buffer.byteLength(html),finalSHA256,fractalColours:{highFractalLow:'#79518a',lowFractalHigh:'#0b7371',historyOpacity:0.42,historyWidth:1.05,currentWidth:2.15}});
await writeFile('public/build-report.json',JSON.stringify(report,null,2));
// Reuse every existing interaction assertion, with the expected release updated.
await writeFile('.colour-final-audit.mjs',(await readFile('final-audit.mjs','utf8')).replaceAll('3.6.1',VERSION));
for(const file of ['browser-audit.mjs','structure-audit-runner.mjs','.colour-final-audit.mjs','fractal-colours-audit.mjs'])execFileSync(process.execPath,[file],{stdio:'inherit'});
const audits=await Promise.all(['engine-audit','structure-engine-audit','browser-audit','structure-browser-audit','final-ui-audit','fractal-colours-audit'].map(async name=>JSON.parse(await readFile('public/'+name+'.json','utf8'))));
const summary={version:VERSION,engineTests:{passed:audits[0].passed+audits[1].passed,total:audits[0].total+audits[1].total},browserTests:{passed:audits.slice(2).reduce((n,a)=>n+a.passed,0),total:audits.slice(2).reduce((n,a)=>n+a.total,0)},colourTests:{passed:audits[5].passed,total:audits[5].total},pass:audits.every(a=>a.pass),finalSHA256};
if(!summary.pass)throw Error('Colour release audit failed');
await writeFile('public/audit-summary.json',JSON.stringify(summary,null,2));
await writeFile('public/release.json',JSON.stringify({version:VERSION,name:'OSD Research Lab',features:['visible-hide-candles','fractal-levels','fractal-history','distinct-fractal-colours','quieter-fractal-history'],sha256:finalSHA256},null,2));
const files={};
const names=['index.html','release.json','audit-summary.json','engine-audit.json','structure-engine-audit.json','browser-audit.json','structure-browser-audit.json','final-ui-audit.json','fractal-colours-audit.json','build-report.json','OSD_Kelly_Edge_Lab_Data_Template.csv',...(report.preservedAssets||[])];
for(const name of new Set(names))files[name]=new Uint8Array(await readFile(path.join('public',name)));
for(const name of await readdir('public/data'))files['data/'+name]=new Uint8Array(await readFile(path.join('public/data',name)));
files['README.txt']=new TextEncoder().encode('OSD Research Lab v'+VERSION+'\nOpen index.html in a desktop browser. No API key or installation required.\nHide candles remains beside Next.\nHF LOW = low of high-fractal candle: muted violet.\nLF HIGH = high of low-fractal candle: teal.\nCurrent lines are bold, historical segments lighter, developing lines dashed and blinking.\nFractal Levels and Fractal History remain independent visibility controls (Levels is the master).\nCandles Off affects H1 only; D1 context is unchanged.\nResearch only, not financial advice.\n');
const zip=zipSync(files,{level:6});
for(const name of ['OSD_Research_Lab_Final.zip','OSD_Research_Lab_Exact.zip'])await writeFile('public/'+name,zip);
console.log('COLOUR RELEASE',JSON.stringify(summary));
