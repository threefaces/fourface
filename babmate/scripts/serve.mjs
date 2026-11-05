import { createServer } from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
const root=resolve('out');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};
createServer(async(req,res)=>{
 try { const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); let target=resolve(root,`.${pathname}`); if(target!==root&&!target.startsWith(root+sep)){res.writeHead(403);res.end();return;} if((await stat(target)).isDirectory())target=resolve(target,'index.html');const body=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream'});res.end(body); }
 catch {res.writeHead(404);res.end('Not found');}
}).listen(3001,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:3001'));
