class MetricsRegistery{
  private totalRequests = 0;
  private totalErrors = 0;
  private requestsByStatus: Record<number, number> = {}
  private requestsByRoute: Record<string, number> = {}
  private requestsByMethod: Record<string, number> = {}
  private totalLatencyMs = 0;
  private startTime = Date.now()


/**
 * Called everytime a request completes or fails
 */

  public recordRequest(method:string, route:string, statusCode: number, latencyMs: number){
    this.totalRequests++

    if(statusCode >= 400) this.totalErrors++

    this.requestsByStatus[statusCode] = (this.requestsByStatus[statusCode] || 0) + 1
    this.requestsByMethod[method] = (this.requestsByMethod[method] || 0) + 1
    this.requestsByRoute[route] = (this.requestsByRoute[route] || 0) + 1

    this.totalLatencyMs += latencyMs
  }

  /**
   * Return a snapshot of current gateway metrices
   */

  public getSnapshot(){
    const upTimeSeconds = Math.floor((Date.now() - this.startTime) / 1000)
    const avgLatencyMs = this.totalRequests > 0 
      ? Number((this.totalLatencyMs / this.totalRequests).toFixed(2))
      : 0
    return {
      upTimeSeconds,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      avgLatencyMs,
      requestsByStatus: this.requestsByStatus,
      requestsByRoute: this.requestsByRoute,
      requestsByMethod: this.requestsByMethod,
    }
  }
}

export const metricsRegistry = new MetricsRegistery()

