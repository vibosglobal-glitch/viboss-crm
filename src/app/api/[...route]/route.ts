import http from 'http';
import { NextRequest } from 'next/server';
import { app } from '../../../../server/app';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let server: http.Server | null = null;
let serverPort = 0;

async function getInternalServerPort(): Promise<number> {
  if (server && serverPort) return serverPort;
  return new Promise((resolve, reject) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server?.address();
      if (typeof address === 'object' && address) {
        serverPort = address.port;
        resolve(serverPort);
      } else {
        reject(new Error('Failed to obtain internal server port'));
      }
    });
    server.on('error', reject);
  });
}

async function handleRequest(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
): Promise<Response> {
  const { route } = await context.params;
  const port = await getInternalServerPort();
  const search = request.nextUrl.search;
  const targetUrl = `http://127.0.0.1:${port}/api/${route.join('/')}${search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const method = request.method;
  const body = (method === 'GET' || method === 'HEAD') ? undefined : await request.arrayBuffer();

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
    cache: 'no-store',
  });

  const resHeaders = new Headers(response.headers);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: resHeaders,
  });
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const DELETE = handleRequest;
export const PATCH = handleRequest;
export const HEAD = handleRequest;
export const OPTIONS = handleRequest;
