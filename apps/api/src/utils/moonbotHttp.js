import http from 'node:http';
import https from 'node:https';
import { Resolver } from 'node:dns';

// Docker service DNS must not occupy libuv's shared getaddrinfo workers.
export function createServiceLookup(resolver = new Resolver({ timeout: 1000, tries: 2 })) {
  return (hostname, options, callback) => {
    resolver.resolve4(hostname, (error, addresses) => {
      if (error || !addresses?.length) return callback(error || new Error('Service has no IPv4 address'));
      if (options?.all) callback(null, addresses.map(address => ({ address, family: 4 })));
      else callback(null, addresses[0], 4);
    });
  };
}

// Dedicated, bounded sockets: Moonbot reads never queue behind other fetch users.
export function createJsonTransport() {
  const lookup = createServiceLookup();
  const agents = {
    'http:': new http.Agent({ lookup, keepAlive: false, maxSockets: 16, maxTotalSockets: 16 }),
    'https:': new https.Agent({ lookup, keepAlive: false, maxSockets: 16, maxTotalSockets: 16 }),
  };
  const MAX_BYTES = 8 * 1024 * 1024;

  return function jsonHttp(url, { method = 'GET', headers = {}, body, signal } = {}) {
    return new Promise((resolve, reject) => {
      const target = new URL(url);
      const transport = target.protocol === 'https:' ? https : http;
      if (!agents[target.protocol]) return reject(new Error('Unsupported Moonbot protocol'));
      const request = transport.request(target, { method, headers, signal, agent: agents[target.protocol] }, response => {
        const chunks = [];
        let length = 0;
        response.on('error', reject);
        response.on('aborted', () => reject(new Error('Moonbot response interrupted')));
        response.on('data', chunk => {
          length += chunk.length;
          if (length > MAX_BYTES) request.destroy(new Error('Moonbot response exceeds limit'));
          else chunks.push(chunk);
        });
        response.on('end', () => {
          const status = response.statusCode;
          const responseHeaders = new Headers();
          for (const [name, value] of Object.entries(response.headers)) {
            if (value !== undefined) responseHeaders.set(name, Array.isArray(value) ? value.join(', ') : value);
          }
          resolve(new Response(method === 'HEAD' || [204, 205, 304].includes(status) ? null : Buffer.concat(chunks), { status, headers: responseHeaders }));
        });
      });
      request.on('error', reject);
      request.end(body);
    });
  };
}

export const moonbotHttp = createJsonTransport();
