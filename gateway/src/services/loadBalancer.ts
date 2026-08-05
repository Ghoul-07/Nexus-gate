import type { RouteConfig } from "../config.js";
import { isHealthy } from "./healthChecker.js";

// tracks the last used index per route , so round robin continues from where it left off on the next request

const roundRobinIndex = new Map<string, number>()

export function getNextTarget(route: RouteConfig): string | null {
  const { pathPrefix, targets} = route

  const healthyTargets = targets.filter(isHealthy)

  if(healthyTargets.length === 0){
    return null
  }

  const lastIndex = roundRobinIndex.get(pathPrefix) ?? -1
  const nextIndex = ( lastIndex + 1) % healthyTargets.length
  roundRobinIndex.set(pathPrefix, nextIndex)

  return healthyTargets[nextIndex]
}