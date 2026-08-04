import { run } from "node:test";
import { ROUTES } from "../config.js";

interface ServiceHealth{
  target:string, 
  status: 'UP' | 'DOWN',
  lastChecked: string
}

// store the current health status
const healthStatusMap = new Map<string, ServiceHealth>()

// function to check health of a service
async function checkServiceHealth(targetUrl: string): Promise<ServiceHealth> {
  try{
    const response = await fetch(`${targetUrl}/health`, {
      signal: AbortSignal.timeout(3000)
    })
    if(response.ok){
      return {
        target: targetUrl,
        status: 'UP',
        lastChecked: new Date().toISOString()
      }
    }
  }catch(err){
    console.log(`service failed to respond`)
  }

  return {
    target: targetUrl,
    status: 'DOWN',
    lastChecked: new Date().toISOString()
  }
}


// periodic polling for all registered targets in ROUTES

export function startHealthCheckPoller(intervalMs : number = 10000){
  const targets = Array.from(new Set(ROUTES.map((r) => r.target)))

  const runChecks = async() =>{
    for(const target of targets){

      const baseUrl = new URL(target).origin
      const health = await checkServiceHealth(baseUrl)
      healthStatusMap.set(baseUrl, health)
    }

    const summary = Array.from(healthStatusMap.entries())
      .map(([url, h]) => `${url}: ${h.status}`)
      .join(' | ');
    console.log(`[Health Monitor]: ${summary}`);
  }

  // run immediately on boot , repeat on interval
  runChecks()
  setInterval(runChecks, intervalMs)
}

export function getServicesHealth(): Record<string, ServiceHealth>{
  return Object.fromEntries(healthStatusMap)
}