import {readFile,writeFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {zipSync} from 'fflate';
import path from 'node:path';
await import('./build.mjs');
let html=await readFile('public/index.html','utf8');
function once(needle,replacement){if(html.split(needle).length!==2)throw Error('Expected unique original UI anchor: '+needle.slice(0,80));html=html.replace(needle,replacement);}
once('class="replay-toolbar replay-toolbar-sticky"','id="replayControls" class="replay-toolbar replay-toolbar-sticky"');
const next='<button class="btn small primary" id="nextBtn" data-sound="next" type="button">Next →</button>';
once(next,next+'\n<button class="btn small" id="chartCandlesToggle" type="button" data-sound="toggle" aria-controls="priceChart" aria-describedby="chartLayerStatus" disabled>Hide candles</button>');
const anchor='        </div>\n        <section class="daily-context-panel"';
once(anchor,`          <div class="osd-chart-layers" role="group" aria-label="Chart layer controls">
            <button class="btn small" id="chartFractalLevelsToggle" type="button" data-sound="toggle" aria-label="Fractal levels" aria-controls="priceChart" aria-pressed="true">Fractal levels: ON</button>
            <button class="btn small" id="chartFractalHistoryToggle" type="button" data-sound="toggle" aria-label="Fractal history" aria-controls="priceChart" aria-pressed="true">Fractal history: ON</button>
            <span id="chartLayerStatus" role="status" aria-live="polite">H1 chart layers are loading.</span><span class="osd-release-chip" id="osdReleaseBadge">v3.6.1</span>
          </div>
`+anchor);
once('<div class="hero-actions">','<div class="hero-actions">\n<a class="btn" id="chartControlsLink" href="#replayControls">Chart / hide candles ↓</a>');
const css=`
/* Extend the native replay component; keep all layer controls outside icon-only actions. */
#replayControls{grid-template-columns:auto minmax(120px,1fr) auto;grid-template-areas:"buttons readout actions" "layers layers layers";scroll-margin-top:8px;}
#replayControls .replay-buttons{grid-area:buttons;grid-template-columns:auto auto minmax(96px,1fr) minmax(116px,1fr);min-width:0;}
#replayControls .replay-readout{grid-area:readout;}
#replayControls .chart-actions{grid-area:actions;}
#replayControls .osd-chart-layers{grid-area:layers;display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding-top:7px;border-top:1px solid var(--line-soft);min-width:0;}
#replayControls .osd-chart-layers .btn{min-height:36px;padding:8px 11px;white-space:nowrap;}
#replayControls .btn{touch-action:manipulation;}
#replayControls .btn:focus:not(:focus-visible){outline:none;}
#replayControls .btn:focus-visible{outline:2px solid var(--green);outline-offset:2px;}
#replayControls #chartCandlesToggle{white-space:nowrap;font:800 9.5px/1.25 var(--mono);letter-spacing:.03em;}
#replayControls #chartCandlesToggle.active,#replayControls .osd-chart-layers .btn.active{background:var(--ink);color:var(--paper-2);border-color:var(--ink);}
#chartLayerStatus{font:700 9px/1.45 var(--mono);color:var(--muted);flex:1 1 180px;}
.osd-release-chip{font:800 9px/1.3 var(--mono);border:1px solid var(--line-soft);padding:4px 6px;white-space:nowrap;color:var(--ink);}
#chartControlsLink{text-decoration:none;}
@media(max-width:1100px){
 #replayControls{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"readout actions" "buttons buttons" "layers layers";}
 #replayControls .replay-readout{text-align:left;padding:0;}
 #replayControls .replay-buttons{grid-template-columns:repeat(4,minmax(0,1fr));width:100%;}
 #replayControls .replay-buttons .btn,#replayControls #nextBtn{min-width:0;}
}
@media(max-width:700px){
 #replayControls .replay-buttons .btn,#replayControls .osd-chart-layers .btn{min-height:44px;font-size:8.5px;}
 #replayControls .osd-chart-layers{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);}
 #replayControls .osd-chart-layers .btn{font-size:8.5px;padding:8px 5px;width:100%;}
 #chartLayerStatus{grid-column:1/-1;}
 .osd-release-chip{justify-self:start;}
}
@media(max-width:520px){
 #replayControls .replay-buttons{grid-template-columns:repeat(2,minmax(0,1fr));}
}
`;
once('</head>','<style id="osd-visible-chart-controls-style">'+css+'</style>\n</head>');
once('</body>','<script>\n'+await readFile('visible-chart-controls.js','utf8')+'\n</script>\n</body>');
await writeFile('public/index.html',html);
const report=JSON.parse(await readFile('public/build-report.json','utf8'));
Object.assign(report,{appVersion:'3.6.1',visibleChartControls:true,patchedBytes:Buffer.byteLength(html),finalSHA256:createHash('sha256').update(html).digest('hex')});
await writeFile('public/build-report.json',JSON.stringify(report,null,2));
// Re-run regression suites against the FINAL artifact, not the intermediate build.
for(const file of ['browser-audit.mjs','structure-audit-runner.mjs','final-audit.mjs'])execFileSync(process.execPath,[file],{stdio:'inherit'});
const audits=await Promise.all(['engine-audit','structure-engine-audit','browser-audit','structure-browser-audit','final-ui-audit'].map(async name=>JSON.parse(await readFile('public/'+name+'.json','utf8'))));
const summary={version:'3.6.1',engineTests:{passed:audits[0].passed+audits[1].passed,total:audits[0].total+audits[1].total},browserTests:{passed:audits.slice(2).reduce((a,x)=>a+x.passed,0),total:audits.slice(2).reduce((a,x)=>a+x.total,0)},pass:audits.every(x=>x.pass),finalSHA256:report.finalSHA256};
await writeFile('public/audit-summary.json',JSON.stringify(summary,null,2));
await writeFile('public/release.json',JSON.stringify({version:'3.6.1',name:'OSD Research Lab',features:['visible-hide-candles','fractal-levels','fractal-history'],sha256:report.finalSHA256},null,2));
const files={};for(const name of ['index.html','release.json','audit-summary.json','engine-audit.json','structure-engine-audit.json','browser-audit.json','structure-browser-audit.json','final-ui-audit.json','build-report.json','OSD_Kelly_Edge_Lab_Data_Template.csv'])files[name]=new Uint8Array(await readFile('public/'+name));
for(const name of await readdir('public/data'))files['data/'+name]=new Uint8Array(await readFile(path.join('public/data',name)));
files['README.txt']=new TextEncoder().encode('OSD Research Lab v3.6.1\nOpen index.html in a desktop browser. No installation is required.\nUse Chart / hide candles at the top, then Hide candles beside Next.\nFractal levels and Fractal history are directly below replay controls.\nPrice hiding is for H1 only. D1 context is preserved. All data and logs remain local.\nResearch only; not trade execution or financial advice.\n');
await writeFile('public/OSD_Research_Lab_Final.zip',zipSync(files,{level:6}));
console.log('FINAL BUILD',JSON.stringify(summary));
