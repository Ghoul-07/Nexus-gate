import type { RouteConfig } from "../config.js";
import { isHealthy } from "./healthChecker.js";
import { getCircuitBreaker } from "./circuitBreaker.js";


// map of origin -> active connections/request
const activeConnections = new Map<string, number>()

export function trackRequestStart(targetUrl: string) : void{
  const origin = new URL(targetUrl).origin
  const current = activeConnections.get(origin) ?? 0
  activeConnections.set(origin, current + 1)
}

export function trackRequestEnd(targetUrl: string): void{
  const origin = new URL(targetUrl).origin
  const current = activeConnections.get(origin) ?? 0
  activeConnections.set(origin, Math.max(0, current - 1))
}

export function getActiveConnections() : Record<string, number>{
  return Object.fromEntries(activeConnections.entries())
}
export function getNextTarget(route: RouteConfig): string | null {
  const { targets} = route

  const availableTargets = targets.filter((target)=>{
    const targetOrigin = new URL(target).origin
    const breaker = getCircuitBreaker(targetOrigin)
    return isHealthy(target) && breaker.allowRequest()
  })

  if(availableTargets.length === 0){
    return null
  }

  // Find the instance with the minimum number of active request
  let selectedTarget = availableTargets[0]
  let minConnections = activeConnections.get(new URL(selectedTarget).origin) ?? 0

  for(let i = 1; i < availableTargets.length; i++){
    const target = availableTargets[i]
    const origin = new URL(target).origin
    const count = activeConnections.get(origin) ?? 0

    if(count <  minConnections){
      selectedTarget = target
      minConnections = count
    }
  }
  
  return selectedTarget
}