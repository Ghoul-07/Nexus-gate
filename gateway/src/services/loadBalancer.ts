import type { RouteConfig } from "../config.js";
import { isHealthy } from "./healthChecker.js";
import { getCircuitBreaker } from "./circuitBreaker.js";


// map of origin -> active connections/request
const activeConnections = new Map<string, number>()

let rrIndex = 0

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

  // Find the minimum connection count among available targets

  let minConnections = Infinity

  for(const target of availableTargets){
    const origin = new URL(target).origin
    const count = activeConnections.get(origin)?? 0
    if(count < minConnections){
      minConnections = count
    }
  }
  // filter candidates that share this min count
  const leastConnectedTargets = availableTargets.filter((target) =>{
    const origin = new URL(target).origin
    const count = activeConnections.get(origin) ?? 0
    return count === minConnections
  }) 
  // round robin among tied candidates
  const chosenIndex = (rrIndex++) % leastConnectedTargets.length
  return leastConnectedTargets[chosenIndex]
}