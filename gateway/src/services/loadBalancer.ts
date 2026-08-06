import type { RouteConfig } from "../config.js";
import { isHealthy } from "./healthChecker.js";
import { getCircuitBreaker } from "./circuitBreaker.js";

// tracks the last used index per route , so round robin continues from where it left off on the next request

const roundRobinIndex = new Map<string, number>()

export function getNextTarget(route: RouteConfig): string | null {
  const { pathPrefix, targets} = route

  const availableTargets = targets.filter((target)=>{
    const targetOrigin = new URL(target).origin
    const breaker = getCircuitBreaker(targetOrigin)

    return isHealthy(target) && breaker.allowRequest()
    
  })

  if(availableTargets.length === 0){
    return null
  }

  const lastIndex = roundRobinIndex.get(pathPrefix) ?? -1
  const nextIndex = ( lastIndex + 1) % availableTargets.length
  roundRobinIndex.set(pathPrefix, nextIndex)

  return availableTargets[nextIndex]
}