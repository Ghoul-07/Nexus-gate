import { telemetryPublisher } from './telemetryPublisher.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number; // e.g. 3 consecutive failures
  cooldownPeriodMs: number; // e.g. 10000ms (10 seconds)
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private nextAttemptTime = 0;
  private targetUrl: string;
  private failureThreshold: number;
  private cooldownPeriodMs: number;

  constructor(targetUrl: string, options: CircuitBreakerOptions = { failureThreshold: 3, cooldownPeriodMs: 10000 }) {
    this.targetUrl = targetUrl;
    this.failureThreshold = options.failureThreshold;
    this.cooldownPeriodMs = options.cooldownPeriodMs;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.transitionTo('HALF_OPEN', 'Cooldown elapsed, probing upstream health');
    }
    return this.state;
  }

  public allowRequest(): boolean {
    const currentState = this.getState();
    return currentState === 'CLOSED' || currentState === 'HALF_OPEN';
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('CLOSED', 'Upstream healthy again');
    }
  }

  public recordFailure(): void {
    this.failureCount++;
    if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.transitionTo('OPEN', `Failure threshold (${this.failureThreshold}) reached`);
    } else if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN', 'Probe request failed during HALF_OPEN state');
    }
  }

  private transitionTo(newState: CircuitState, reason?: string): void {
    const previousState = this.state;
    this.state = newState;

    if (newState === 'OPEN') {
      this.nextAttemptTime = Date.now() + this.cooldownPeriodMs;
    }

    // Emits event matching the shared contract: { targetUrl, previousState, newState, reason }
    telemetryPublisher.emitCircuitBreakerStateChange({
      targetUrl: this.targetUrl,
      previousState,
      newState,
      reason,
    });
  }
}

// Global map holding circuit breakers per target url
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(targetUrl: string): CircuitBreaker {
  if (!breakers.has(targetUrl)) {
    breakers.set(targetUrl, new CircuitBreaker(targetUrl));
  }
  return breakers.get(targetUrl)!;
}