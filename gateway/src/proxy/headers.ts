import type { IncomingHttpHeaders } from "node:http";
import type { Request } from "express";

// RFC 7230 Section 6.1: Hop-by-hop headers that must not be forwarded
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-unauthorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
])

/* Strips hop-by-hop headers from an incoming or outgoing headers object */
export function sanitizeHeaders(headers: IncomingHttpHeaders): Record<string, string | string[] >{
  const cleaned : Record<string, string | string[] > = {}

  for(const [key,value] of Object.entries(headers)){
    if(!value) continue
    const lowerKey = key.toLowerCase()

    // Drop any hop by hop header
    if(!HOP_BY_HOP_HEADERS.has(lowerKey)){
      cleaned[lowerKey] = value
    }
  }
    return cleaned
}
  

  /**
   * Prepares the headers object to send to the upstream service,
   * injecting and appending standard X-Forwarded-* headers.
  */
  export function buildUpstreamHeaders(req: Request, targetHost: string): Record<string , string | string[]>{
    const headers = sanitizeHeaders(req.headers)

    // set host header to the target host
    headers['host'] = targetHost

    // Append or initialize X-Forwarded-For
    const clientIp = req.socket.remoteAddress || ''
    const existingXff = req.headers['x-forwarded-for']
    if(existingXff){
      headers['x-forwarded-for'] = `${existingXff},${clientIp}`
    }
    else if(clientIp) headers['x-forwarded-for'] = clientIp

    // preserve or set original protocol
    headers['x-forwarded-proto'] = req.protocol || ( req.secure? 'https' : 'http')

    // preserve original requested host
    if(req.headers.host){
      headers['x-forwarded-host'] = req.headers.host
    }

    // If GET/HEAD/DELETE, strip content-length & content-type so upstream doesn't wait for a phantom body
    const method = req.method.toUpperCase();
    if (['GET', 'HEAD', 'DELETE', 'OPTIONS'].includes(method)) {
      delete headers['content-length'];
      delete headers['content-type'];
    }

    return headers
  }

