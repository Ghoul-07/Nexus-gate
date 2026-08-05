import { ROUTES } from "../config.js";

interface ServiceHealth{
  target: string, 
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
    console.log(`service failed to respond: ${targetUrl}`)
  }

  return {
    target: targetUrl,
    status: 'DOWN',
    lastChecked: new Date().toISOString()
  }
}

// periodic polling for all registered targets in ROUTES

export function startHealthCheckPoller(intervalMs : number = 10000){
  // flatten all targets accross all routes

  const origins = new Set<string>()
  ROUTES.forEach(route =>{
    route.targets.forEach(target => {
      origins.add(new URL(target).origin)
    })
  })

  const runChecks = async() =>{
    for(const origin of origins){
      const health = await checkServiceHealth(origin)
      healthStatusMap.set(origin, health)
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


// Used by the load balancer to skip down instances

export function isHealthy(target: string) : boolean{
  const origin = new URL(target).origin
  const health = healthStatusMap.get(origin)

  return health? health.status === 'UP' : true

}