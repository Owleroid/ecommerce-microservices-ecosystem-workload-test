import { Request, Response } from 'express';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  service: string;
  timestamp: string;
  uptime: number;
  checks?: Record<string, boolean>;
}

export const createHealthHandler = (
  serviceName: string,
  additionalChecks?: () => Promise<Record<string, boolean>>
) => {
  return async (_req: Request, res: Response) => {
    const startTime = process.uptime();
    
    const health: HealthStatus = {
      status: 'healthy',
      service: serviceName,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(startTime)
    };

    if (additionalChecks) {
      try {
        health.checks = await additionalChecks();
        const allHealthy = Object.values(health.checks).every(check => check === true);
        health.status = allHealthy ? 'healthy' : 'unhealthy';
      } catch (error) {
        health.status = 'unhealthy';
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  };
};
