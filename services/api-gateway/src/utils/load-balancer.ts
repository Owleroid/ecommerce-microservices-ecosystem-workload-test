import { logger } from 'service-common';

/**
 * Simple round-robin load balancer for service URLs
 */
export class ServiceLoadBalancer {
  private urls: string[];
  private currentIndex: number = 0;
  private healthyUrls: Set<string>;

  constructor(urlsConfig: string) {
    // Parse comma-separated URLs
    this.urls = urlsConfig.split(',').map(url => url.trim()).filter(url => url.length > 0);
    this.healthyUrls = new Set(this.urls);

    if (this.urls.length === 0) {
      throw new Error('No service URLs configured');
    }

    logger.info('Service load balancer initialized', {
      urls: this.urls,
      count: this.urls.length
    });
  }

  /**
   * Get next available service URL using round-robin
   */
  getNext(): string {
    if (this.healthyUrls.size === 0) {
      // All services are down, try all URLs anyway
      logger.warn('All services marked unhealthy, attempting all URLs');
      this.healthyUrls = new Set(this.urls);
    }

    // Round-robin through healthy URLs
    const healthyUrlArray = Array.from(this.healthyUrls);
    const url = healthyUrlArray[this.currentIndex % healthyUrlArray.length];
    this.currentIndex = (this.currentIndex + 1) % healthyUrlArray.length;

    return url;
  }

  /**
   * Get all configured URLs
   */
  getAllUrls(): string[] {
    return [...this.urls];
  }

  /**
   * Mark a service URL as unhealthy (optional: for circuit breaker pattern)
   */
  markUnhealthy(url: string): void {
    if (this.healthyUrls.has(url)) {
      this.healthyUrls.delete(url);
      logger.warn('Service marked unhealthy', {
        url,
        remainingHealthy: this.healthyUrls.size
      });
    }
  }

  /**
   * Mark a service URL as healthy again
   */
  markHealthy(url: string): void {
    if (this.urls.includes(url) && !this.healthyUrls.has(url)) {
      this.healthyUrls.add(url);
      logger.info('Service marked healthy', {
        url,
        totalHealthy: this.healthyUrls.size
      });
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): { total: number; healthy: number; unhealthy: number } {
    return {
      total: this.urls.length,
      healthy: this.healthyUrls.size,
      unhealthy: this.urls.length - this.healthyUrls.size
    };
  }
}

/**
 * Parse service URL(s) from config (single URL or comma-separated list)
 */
export function parseServiceUrls(urlConfig: string): string[] {
  return urlConfig.split(',').map(url => url.trim()).filter(url => url.length > 0);
}

/**
 * Check if multiple instances are configured
 */
export function hasMultipleInstances(urlConfig: string): boolean {
  return parseServiceUrls(urlConfig).length > 1;
}
