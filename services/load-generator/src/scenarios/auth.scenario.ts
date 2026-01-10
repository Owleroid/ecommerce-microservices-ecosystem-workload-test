import { HttpClient } from '../utils/http-client';
import { TestUser, RequestResult } from '../types';

export class AuthScenario {
  private client: HttpClient;
  private testUsers: TestUser[] = [];
  private userIndex: number = 0;

  constructor(apiUrl: string) {
    this.client = new HttpClient(apiUrl);
  }

  /**
   * Create test users for the scenario
   */
  async setupUsers(count: number): Promise<void> {
    console.log(`\n🔧 Setting up ${count} test users for auth scenario...`);
    
    for (let i = 0; i < count; i++) {
      const email = `loadtest-auth-${Date.now()}-${i}@example.com`;
      const password = `TestPass${i}123!`;
      
      this.testUsers.push({ email, password });
    }

    console.log(`✓ Created ${count} test users`);
  }

  /**
   * Authentication flood: Register new users
   */
  async register(): Promise<RequestResult> {
    const user = this.testUsers[this.userIndex % this.testUsers.length];
    this.userIndex++;

    return this.client.post(
      '/api/auth/register',
      {
        email: user.email,
        password: user.password
      },
      { 'Content-Type': 'application/json' },
      'auth-register'
    );
  }

  /**
   * Authentication flood: Login with existing users
   */
  async login(): Promise<RequestResult> {
    // Use already registered users or cycle through
    const user = this.testUsers[this.userIndex % this.testUsers.length];
    this.userIndex++;

    const result = await this.client.post(
      '/api/auth/login',
      {
        email: user.email,
        password: user.password
      },
      { 'Content-Type': 'application/json' },
      'auth-login'
    );

    // Store token if login successful
    if (result.success && result.statusCode === 200) {
      // Token would be in response body, but we don't parse it here
      // For simplicity, we'll handle token management in the combined scenario
    }

    return result;
  }

  /**
   * Mixed authentication scenario: Register + Login
   */
  async mixed(): Promise<RequestResult> {
    // 50% register, 50% login
    if (Math.random() < 0.5) {
      return this.register();
    } else {
      return this.login();
    }
  }

  /**
   * Refresh token scenario
   */
  async refreshToken(refreshToken: string): Promise<RequestResult> {
    return this.client.post(
      '/api/auth/refresh',
      { refreshToken },
      { 'Content-Type': 'application/json' },
      'auth-refresh'
    );
  }
}
