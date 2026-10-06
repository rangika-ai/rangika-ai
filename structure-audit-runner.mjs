import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import chromium from '@sparticuz/chromium';
import {chromium as playwright} from 'playwright-core';
import {auditStructureView} from './structure-view-audit.mjs';
const tests=[],errors=[],root=path.resolve('public');let server,browser;
const check=(name,pass,detail)=>{tests.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});console.log('STRUCTURE',pass?'PASS':'FAIL',name);};
try{
 server=createServer(async(req,res)=>{try{let name=new URL(req.url,'http://localhost').pathname;if(name==='/')name='/index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw Error('Invalid path');const bytes=await readFile(file);res.writeHead(200,{'content-type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await playwright.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load'});
 await page.waitForFunction(()=>typeof state!=='undefined'&&state.records.length>20&&window.OSDStructureView&&document.querySelector('#priceChart'));
 await page.waitForTimeout(1000);
 if(await page.locator('#welcomeModal.open').isVisible()){await page.locator('#dontShowWelcome').check();await page.locator('#welcomeStartBtn').click();await page.locator('#welcomeModal').waitFor({state:'hidden'});}
 await auditStructureView(page,check);check('Structure: no JavaScript page errors',errors.length===0,errors);
}catch(e){check('Structure browser audit completed',false,String(e.stack||e));}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
const report={version:'3.6.0-structure-view',passed:tests.filter(t=>t.pass).length,total:tests.length,pass:tests.every(t=>t.pass),tests,errors};
await writeFile('public/structure-browser-audit.json',JSON.stringify(report,null,2));
console.log('STRUCTURE BROWSER AUDIT:',report.passed+'/'+report.total);
if(!report.pass)throw Error('Structure view browser audit failed.');
