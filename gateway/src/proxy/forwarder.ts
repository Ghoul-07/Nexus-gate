import http from 'http'
import https from 'https'
import type { Request, Response } from 'express'
import {httpAgent, httpsAgent} from './agent.js'
import { buildUpstreamHeaders, sanitizeHeaders } from './headers.js'

export interface ForwardOptions {
  target: string; // e.g. "http://127.0.0.1:4001"
  timeoutMs?: number; // defaults to 10000ms
  onResponse?: (statusCode: number) => void;
  onError?: (err: Error, statusCode: number) => void;
}

export function forwardRequest(req: Request, res:Response, options:ForwardOptions) :Promise<void>{
  return new Promise((resolve)=>{
    const {target, timeoutMs = 10000, onResponse, onError} = options
    const targetUrl = new URL(target)
    const isHttps = targetUrl.protocol === 'https'

  
    // 1. Prepare upstream request options
    const upstreamHeaders = buildUpstreamHeaders(req, targetUrl.host);

    // Clean up base path and append relative request subpath + query string
    const targetBasePath = targetUrl.pathname.replace(/\/+$/, '');
    const [subPath, queryString] = (req.url || '/').split('?');
    const cleanSubPath = subPath.replace(/^\/+/, '');

    let outboundPath = targetBasePath;
    if (cleanSubPath) {
      outboundPath = `${targetBasePath}/${cleanSubPath}`;
    }
    if (!outboundPath) {
      outboundPath = '/';
    }
    if (queryString) {
      outboundPath += `?${queryString}`;
    }

    const requestOptions: http.RequestOptions = {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: outboundPath,
      method: req.method,
      headers: upstreamHeaders,
      agent: isHttps ? httpsAgent : httpAgent,
      timeout: timeoutMs,
    };
    const transport = isHttps ? https : http
    
    // open outbound stream to upstream services
    const upstreamReq = transport.request(requestOptions, (upstreamRes)=>{
     
      // clean up hop by hop headers from upstream response
      const responseHeaders = sanitizeHeaders(upstreamRes.headers)

      // write upstream status and headers to client
      res.writeHead(upstreamRes.statusCode || 200, responseHeaders)

      if(onResponse && upstreamRes.statusCode){
        onResponse(upstreamRes.statusCode)
      }

      // stream upstream response body directly to client
      upstreamRes.pipe(res)

      upstreamRes.on('end', ()=>{
        resolve()
      })

    })

    // Handle upstream timeouts (504)
    upstreamReq.on('timeout', ()=>{
      upstreamReq.destroy(new Error('Gateway Timeout'))
      if(!res.headersSent){
        res.status(504).json({
          error: 'Gateway Timeout',
          message: `Upstream target ${target} timed out after ${timeoutMs}ms`,
        });
      }

      if(onError){
        onError( new Error("Gateway Timeout"), 504)
      }
      resolve()
    })

    // Handle network errors and connection refused (502)
    upstreamReq.on('error', (err:Error)=>{
      if(!res.headersSent){
        res.status(502).json({
          error: 'Bad Gateway',
          message: `Failed to reach upstream service at ${target}`
        })
      }
      if(onError){
        onError(err, 502)
      }
      resolve()
    })

    // client abort propagation (no orphaned sockets)
    req.on('close', ()=>{
      if(!upstreamReq.destroyed && !res.writableEnded){
        upstreamReq.destroy()
      } 
    })

    // stream incoming client request body into upstream request
    // 7. Handle request payload vs empty GET/HEAD methods
    // 7. Pipe body or end request
    const method = req.method.toUpperCase();
    const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(method);

    if (isBodyMethod && !req.readableEnded) {
      req.pipe(upstreamReq);
    } else {
      upstreamReq.end();
    }
  })
}