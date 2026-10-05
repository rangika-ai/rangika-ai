import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(await readFile(new URL('./fractal-levels.js',import.meta.url),'utf8'),context);
const report=context.OSDFractalEngine.selfTest();
console.log(JSON.stringify(report,null,2));
if(!report.pass)process.exit(1);
