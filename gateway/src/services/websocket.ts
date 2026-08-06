import {WebSocketServer, WebSocket} from 'ws'
import type { Server } from 'http'
import { metricsRegistry } from './metrics.js'

let wss: WebSocketServer | null = null

/**
 * Initialize the Websocket server attached to the http server
 */

export function initWebSocketServer(server: Server) : WebSocketServer{
  wss = new WebSocketServer({server, path: '/ws'})
  wss.on('connection', (ws)=>{
    console.log("Dashboard client connected via websocket")

    // send current metrics immediately upon joining
    ws.send(
      JSON.stringify({
        type:'METRICS_SNAPSHOT',
        data:metricsRegistry.getSnapshot()
      })
    )

    ws.on('close', ()=>{
      console.log("Dashboard client disconnected")
    })
  })

  setInterval(() =>{
    broadcastWS('METRICS_UPDATE', metricsRegistry.getSnapshot())
  },1000)
  return wss
}

/**
 * Broadcasts a message to all currently connected websocket clients
 */

export function broadcastWS(type: string, data: unknown): void{
  if(!wss) return 

  const payload = JSON.stringify({
    type,
    data,
    timestamp: Date.now()
  })

  wss.clients.forEach((client)=>{
    if(client.readyState === WebSocket.OPEN){
      client.send(payload)
    }
  })
}