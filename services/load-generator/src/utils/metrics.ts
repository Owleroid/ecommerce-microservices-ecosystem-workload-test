import { RequestResult, MetricsSummary } from '../types';

export class MetricsCollector {
  private results: RequestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = Date.now();
    this.results = [];
  }

  end(): void {
    this.endTime = Date.now();
  }

  addResult(result: RequestResult): void {
    this.results.push(result);
  }

  getResults(): RequestResult[] {
    return this.results;
  }

  getSummary(scenario: string): MetricsSummary {
    if (this.results.length === 0) {
      return this.getEmptySummary(scenario);
    }

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    const durations = this.results.map(r => r.duration).sort((a, b) => a - b);

    const totalDuration = (this.endTime - this.startTime) / 1000; // seconds

    // Calculate status code distribution
    const statusCodes: Record<number, number> = {};
    this.results.forEach(r => {
      statusCodes[r.statusCode] = (statusCodes[r.statusCode] || 0) + 1;
    });

    // Calculate error distribution
    const errors: Record<string, number> = {};
    failed.forEach(r => {
      const errorKey = r.error || 'Unknown error';
      errors[errorKey] = (errors[errorKey] || 0) + 1;
    });

    return {
      scenario,
      totalRequests: this.results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      errorRate: (failed.length / this.results.length) * 100,
      duration: totalDuration,
      actualRPS: this.results.length / totalDuration,
      latency: {
        min: durations[0],
        max: durations[durations.length - 1],
        mean: durations.reduce((a, b) => a + b, 0) / durations.length,
        p50: this.percentile(durations, 50),
        p90: this.percentile(durations, 90),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99)
      },
      statusCodes,
      errors
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private getEmptySummary(scenario: string): MetricsSummary {
    return {
      scenario,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      errorRate: 0,
      duration: 0,
      actualRPS: 0,
      latency: { min: 0, max: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0 },
      statusCodes: {},
      errors: {}
    };
  }

  printSummary(summary: MetricsSummary): void {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 LOAD TEST RESULTS - ${summary.scenario.toUpperCase()}`);
    console.log('='.repeat(80));
    
    console.log('\n📈 Request Statistics:');
    console.log(`  Total Requests:      ${summary.totalRequests}`);
    console.log(`  Successful:          ${summary.successfulRequests} (${(100 - summary.errorRate).toFixed(2)}%)`);
    console.log(`  Failed:              ${summary.failedRequests} (${summary.errorRate.toFixed(2)}%)`);
    console.log(`  Duration:            ${summary.duration.toFixed(2)}s`);
    console.log(`  Actual RPS:          ${summary.actualRPS.toFixed(2)}`);

    console.log('\n⏱️  Latency (milliseconds):');
    console.log(`  Min:                 ${summary.latency.min.toFixed(2)}ms`);
    console.log(`  Max:                 ${summary.latency.max.toFixed(2)}ms`);
    console.log(`  Mean:                ${summary.latency.mean.toFixed(2)}ms`);
    console.log(`  P50 (median):        ${summary.latency.p50.toFixed(2)}ms`);
    console.log(`  P90:                 ${summary.latency.p90.toFixed(2)}ms`);
    console.log(`  P95:                 ${summary.latency.p95.toFixed(2)}ms`);
    console.log(`  P99:                 ${summary.latency.p99.toFixed(2)}ms`);

    console.log('\n📡 Status Code Distribution:');
    Object.entries(summary.statusCodes)
      .sort((a, b) => parseInt(b[1] as any) - parseInt(a[1] as any))
      .forEach(([code, count]) => {
        const percentage = ((count / summary.totalRequests) * 100).toFixed(2);
        console.log(`  ${code}: ${count} (${percentage}%)`);
      });

    if (Object.keys(summary.errors).length > 0) {
      console.log('\n❌ Error Distribution:');
      Object.entries(summary.errors)
        .sort((a, b) => parseInt(b[1] as any) - parseInt(a[1] as any))
        .forEach(([error, count]) => {
          const percentage = ((count / summary.failedRequests) * 100).toFixed(2);
          const errorShort = error.length > 60 ? error.substring(0, 57) + '...' : error;
          console.log(`  ${errorShort}: ${count} (${percentage}%)`);
        });
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  printProgress(current: number, total: number, elapsed: number): void {
    const percentage = ((current / total) * 100).toFixed(1);
    const successCount = this.results.filter(r => r.success).length;
    const failCount = this.results.filter(r => !r.success).length;
    const currentRPS = current / (elapsed / 1000);
    
    process.stdout.write(
      `\r⏳ Progress: ${current}/${total} (${percentage}%) | ` +
      `✓ ${successCount} | ✗ ${failCount} | ` +
      `RPS: ${currentRPS.toFixed(2)} | ` +
      `Time: ${(elapsed / 1000).toFixed(1)}s`
    );
  }
}
