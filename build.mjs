import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const reference=process.env.OSD_REFERENCE_BUILD_URL;
if(!reference)throw new Error('OSD_REFERENCE_BUILD_URL is required for the isolated preview build.');
const base=new URL(reference);const cookies=new Map();
async function retrieve(relative){
 let url=new URL(relative,base);url.search=base.search;
 for(let hop=0;hop<8;hop++){
  if(url.origin!==base.origin)throw new Error('Reference authentication redirected outside the deployment.');
  const r=await fetch(url,{redirect:'manual',headers:{cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},signal:AbortSignal.timeout(45000)});
  for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
  if([301,302,303,307,308].includes(r.status)){url=new URL(r.headers.get('location'),url);continue;}
  if(!r.ok)throw new Error(`Reference file ${relative}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
 }
 throw new Error('Too many reference redirects');
}
await mkdir('public/data',{recursive:true});
const original=await retrieve('/');
let html=original.toString('utf8');
if(!html.includes('priceChart')||!html.includes('currentIndex')||!html.includes('OSDResearchHypothesis'))throw new Error('The complete expected Research Lab was not returned.');
const originalSHA1=createHash('sha1').update(original).digest('hex');
console.log('Original application recovered:',original.length,'bytes; SHA1',originalSHA1);
const dependencies=['data/manifest.json','data/ndaq100-h1.js','data/ndaq100-d1.js','data/ndaq100-h1.json.gz','data/ndaq100-d1.json.gz'];
for(const file of dependencies){const bytes=await retrieve('/'+file);await writeFile(path.join('public',file),bytes);console.log('Retained asset:',file,bytes.length);}
const lines=html.split('\n');
const matches=[];for(let i=0;i<lines.length;i++){if(/function\s+[^ (]*(?:[Ff]ractal|[Cc]hart)|(?:window\.)?renderChart\s*=|const state\s*=|let state\s*=/.test(lines[i]))matches.push({line:i+1,text:lines[i].slice(0,240)});}
await writeFile('public/inspection-index.json',JSON.stringify({bytes:original.length,originalSHA1,lineCount:lines.length,matches},null,2));
await mkdir('public/inspect',{recursive:true});
for(let i=0;i<lines.length;i+=100){await writeFile(`public/inspect/${i+1}.txt`,lines.slice(i,i+100).map((l,j)=>`${i+j+1}: ${l}`).join('\n'));}
let patch='';try{patch=await readFile('fractal-levels.js','utf8')}catch{}
if(patch)html=html.replace(/<\/body>/i,`<script>\n${patch}\n</script>\n</body>`);
await writeFile('public/index.html',html);
await writeFile('public/build-report.json',JSON.stringify({originalSHA1,originalBytes:original.length,patchedBytes:Buffer.byteLength(html),featureInstalled:Boolean(patch),preservedAssets:dependencies},null,2));
