import { LoadTestConfig, RequestResult } from '../types';
import { MetricsCollector } from '../utils/metrics';
import { AuthScenario } from '../scenarios/auth.scenario';
import { ProfileScenario } from '../scenarios/profile.scenario';
import { AvatarScenario } from '../scenarios/avatar.scenario';

export class LoadTestRunner {
  private config: LoadTestConfig;
  private metrics: MetricsCollector;
  private authScenario: AuthScenario;
  private profileScenario: ProfileScenario;
  private avatarScenario: AvatarScenario;
  private isRunning: boolean = false;

  constructor(config: LoadTestConfig) {
    this.config = config;
    this.metrics = new MetricsCollector();
    this.authScenario = new AuthScenario(config.apiUrl);
    this.profileScenario = new ProfileScenario(config.apiUrl);
    this.avatarScenario = new AvatarScenario(config.apiUrl);
  }

  async run(): Promise<void> {
    console.log('\n🚀 Starting Load Test');
    console.log('='.repeat(80));
    console.log(`  API URL:          ${this.config.apiUrl}`);
    console.log(`  Scenario:         ${this.config.scenario}`);
    console.log(`  Duration:         ${this.config.duration}s`);
    console.log(`  Target RPS:       ${this.config.rps}`);
    console.log(`  Mode:             ${this.config.mode}`);
    if (this.config.mode === 'burst') {
      console.log(`  Burst Interval:   ${this.config.burstInterval}s`);
      console.log(`  Burst Multiplier: ${this.config.burstMultiplier}x`);
    }
    console.log('='.repeat(80));

    // Setup phase
    await this.setup();

    // Run test
    this.metrics.start();
    this.isRunning = true;

    if (this.config.mode === 'constant') {
      await this.runConstantLoad();
    } else {
      await this.runBurstLoad();
    }

    this.isRunning = false;
    this.metrics.end();

    // Print results
    const summary = this.metrics.getSummary(this.config.scenario);
    this.metrics.printSummary(summary);
  }

  private async setup(): Promise<void> {
    const userCount = Math.max(10, Math.ceil(this.config.rps * 2)); // At least 10 users

    switch (this.config.scenario) {
      case 'auth':
        await this.authScenario.setupUsers(userCount);
        // Pre-register some users for login tests
        console.log('Pre-registering users...');
        for (let i = 0; i < Math.min(userCount, 20); i++) {
          await this.authScenario.register();
        }
        break;
      
      case 'profile':
        await this.profileScenario.setupUsers(userCount);
        break;
      
      case 'avatar':
        await this.avatarScenario.setupUsers(Math.min(userCount, 10)); // Fewer users for heavy uploads
        break;
      
      case 'all':
        await this.authScenario.setupUsers(userCount);
        await this.profileScenario.setupUsers(userCount);
        await this.avatarScenario.setupUsers(Math.min(userCount, 10));
        break;
    }
  }

  private async runConstantLoad(): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + (this.config.duration * 1000);
    const intervalMs = 1000 / this.config.rps; // Time between requests
    
    let requestCount = 0;
    const expectedTotal = this.config.duration * this.config.rps;

    while (Date.now() < endTime && this.isRunning) {
      const requestStart = Date.now();
      
      // Execute request (don't await, fire and forget within rate limit)
      this.executeScenarioRequest().then(result => {
        this.metrics.addResult(result);
      });
      
      requestCount++;
      
      // Print progress every second
      if (requestCount % Math.max(1, this.config.rps) === 0) {
        this.metrics.printProgress(requestCount, expectedTotal, Date.now() - startTime);
      }
      
      // Wait to maintain target RPS
      const elapsed = Date.now() - requestStart;
      const waitTime = Math.max(0, intervalMs - elapsed);
      await this.sleep(waitTime);
    }

    // Wait for in-flight requests to complete
    await this.sleep(2000);
    console.log('\n');
  }

  private async runBurstLoad(): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + (this.config.duration * 1000);
    const burstInterval = (this.config.burstInterval || 10) * 1000;
    const burstMultiplier = this.config.burstMultiplier || 5;
    
    let requestCount = 0;
    let lastBurstTime = 0;

    while (Date.now() < endTime && this.isRunning) {
      const now = Date.now();
      const timeSinceLastBurst = now - lastBurstTime;
      
      // Determine current RPS (burst or normal)
      const isBurst = timeSinceLastBurst < 5000; // 5 second burst duration
      const currentRPS = isBurst ? this.config.rps * burstMultiplier : this.config.rps;
      const intervalMs = 1000 / currentRPS;
      
      // Trigger new burst?
      if (!isBurst && timeSinceLastBurst >= burstInterval) {
        console.log(`\n💥 BURST MODE ACTIVATED (${burstMultiplier}x RPS for 5s)`);
        lastBurstTime = now;
      }
      
      const requestStart = Date.now();
      
      // Execute request
      this.executeScenarioRequest().then(result => {
        this.metrics.addResult(result);
      });
      
      requestCount++;
      
      // Print progress
      if (requestCount % Math.max(1, currentRPS) === 0) {
        this.metrics.printProgress(requestCount, requestCount + 1, Date.now() - startTime);
      }
      
      // Wait to maintain target RPS
      const elapsed = Date.now() - requestStart;
      const waitTime = Math.max(0, intervalMs - elapsed);
      await this.sleep(waitTime);
    }

    // Wait for in-flight requests
    await this.sleep(2000);
    console.log('\n');
  }

  private async executeScenarioRequest(): Promise<RequestResult> {
    try {
      switch (this.config.scenario) {
        case 'auth':
          return await this.authScenario.mixed();
        
        case 'profile':
          return await this.profileScenario.mixed();
        
        case 'avatar':
          return await this.avatarScenario.mixed();
        
        case 'all':
          // Mix of all scenarios (40% auth, 40% profile, 20% avatar)
          const rand = Math.random();
          if (rand < 0.4) {
            return await this.authScenario.mixed();
          } else if (rand < 0.8) {
            return await this.profileScenario.mixed();
          } else {
            return await this.avatarScenario.mixed();
          }
        
        default:
          throw new Error(`Unknown scenario: ${this.config.scenario}`);
      }
    } catch (error: any) {
      return {
        timestamp: Date.now(),
        duration: 0,
        statusCode: 0,
        success: false,
        error: error.message || 'Unknown error',
        scenario: this.config.scenario,
        endpoint: 'unknown'
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
