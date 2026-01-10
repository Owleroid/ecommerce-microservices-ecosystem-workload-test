#!/usr/bin/env node

import { Command } from 'commander';
import { LoadTestRunner } from './utils/runner';
import { LoadTestConfig } from './types';

const program = new Command();

program
  .name('load-generator')
  .description('Load testing tool for microservices ecosystem')
  .version('1.0.0');

program
  .option('-u, --url <url>', 'API base URL', 'http://localhost')
  .option('-s, --scenario <type>', 'Test scenario: auth | profile | avatar | all', 'all')
  .option('-d, --duration <seconds>', 'Test duration in seconds', '60')
  .option('-r, --rps <number>', 'Requests per second', '10')
  .option('-m, --mode <type>', 'Load mode: constant | burst', 'constant')
  .option('-b, --burst-interval <seconds>', 'Seconds between bursts (burst mode)', '10')
  .option('-x, --burst-multiplier <number>', 'RPS multiplier for bursts (burst mode)', '5')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options) => {
    const config: LoadTestConfig = {
      apiUrl: options.url,
      scenario: options.scenario as any,
      duration: parseInt(options.duration),
      rps: parseFloat(options.rps),
      mode: options.mode as any,
      burstInterval: options.burstInterval ? parseInt(options.burstInterval) : 10,
      burstMultiplier: options.burstMultiplier ? parseInt(options.burstMultiplier) : 5,
      verbose: options.verbose
    };

    // Validate inputs
    if (!['auth', 'profile', 'avatar', 'all'].includes(config.scenario)) {
      console.error('Error: Invalid scenario. Must be: auth, profile, avatar, or all');
      process.exit(1);
    }

    if (!['constant', 'burst'].includes(config.mode)) {
      console.error('Error: Invalid mode. Must be: constant or burst');
      process.exit(1);
    }

    if (config.duration < 1 || config.duration > 3600) {
      console.error('Error: Duration must be between 1 and 3600 seconds');
      process.exit(1);
    }

    if (config.rps < 0.1 || config.rps > 1000) {
      console.error('Error: RPS must be between 0.1 and 1000');
      process.exit(1);
    }

    // Run the test
    try {
      const runner = new LoadTestRunner(config);
      await runner.run();
      process.exit(0);
    } catch (error: any) {
      console.error('\n❌ Load test failed:', error.message);
      if (config.verbose && error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Add examples to help
program.addHelpText('after', `

Examples:
  # Authentication flood test (constant 10 RPS for 60s)
  $ load-generator --scenario auth --duration 60 --rps 10

  # Profile read/write test (constant 5 RPS for 120s)
  $ load-generator --scenario profile --duration 120 --rps 5

  # Avatar upload stress test (constant 2 RPS for 60s)
  $ load-generator --scenario avatar --duration 60 --rps 2

  # Mixed scenario with burst mode
  $ load-generator --scenario all --duration 180 --rps 10 --mode burst

  # High RPS burst test
  $ load-generator --scenario auth --duration 60 --rps 20 --mode burst --burst-interval 15 --burst-multiplier 10

  # Custom API URL
  $ load-generator --url http://api.example.com --scenario profile --duration 30 --rps 5
`);

program.parse(process.argv);
