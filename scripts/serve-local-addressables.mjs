import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'C:/Users/joker/SPOMOVE/ServerData');
const port = Number(process.env.ADDRESSABLES_PORT ?? 8877);
const contentTypes = {
  '.bin': 'application/octet-stream',
  '.bundle': 'application/octet-stream',
  '.hash': 'text/plain; charset=utf-8',
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
  const file = normalize(resolve(root, `.${pathname}`));
  const headers = { 'Access-Control-Allow-Origin': '*' };
  if (file !== root && !file.startsWith(`${root}\\`) && !file.startsWith(`${root}/`)) {
    response.writeHead(403, headers).end();
    return;
  }

  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    response.writeHead(200, {
      ...headers,
      'Content-Length': info.size,
      'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, headers).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Addressables: http://127.0.0.1:${port}/WebGL/`);
});
