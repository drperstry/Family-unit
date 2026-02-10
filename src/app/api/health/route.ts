import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getDBStats, isConnected } from '@/lib/db';

/**
 * Health Check Endpoint
 *
 * GET /api/health
 *
 * Returns the health status of the application including:
 * - Overall status
 * - Database connection status
 * - Server timestamp
 * - Environment information
 *
 * Use this endpoint for:
 * - Vercel health checks
 * - Load balancer health probes
 * - Monitoring and alerting
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Basic health info
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    environment: string;
    version: string;
    checks: {
      database: {
        status: 'connected' | 'disconnected' | 'error';
        latency?: number;
        host?: string;
        name?: string;
        error?: string;
      };
    };
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: {
        status: 'disconnected',
      },
    },
  };

  // Check database connection
  try {
    const dbStartTime = Date.now();
    await connectDB();
    const dbLatency = Date.now() - dbStartTime;

    const dbStats = await getDBStats();

    health.checks.database = {
      status: dbStats.connected ? 'connected' : 'disconnected',
      latency: dbLatency,
      host: dbStats.host,
      name: dbStats.name,
    };

    if (!dbStats.connected) {
      health.status = 'degraded';
    }
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  // Determine HTTP status code
  const statusCode =
    health.status === 'healthy' ? 200 :
    health.status === 'degraded' ? 200 :
    503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`,
    },
  });
}

/**
 * HEAD request for quick health check
 * Returns 200 if healthy, 503 if unhealthy
 */
export async function HEAD(request: NextRequest) {
  try {
    // Quick database ping
    if (!isConnected()) {
      await connectDB();
    }

    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
