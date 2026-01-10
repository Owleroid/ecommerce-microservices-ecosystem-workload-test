import { HttpClient } from '../utils/http-client';
import { TestUser, RequestResult } from '../types';
import axios from 'axios';

export class ProfileScenario {
  private client: HttpClient;
  private testUsers: TestUser[] = [];
  private userIndex: number = 0;

  constructor(apiUrl: string) {
    this.client = new HttpClient(apiUrl);
  }

  /**
   * Setup users with authentication tokens
   */
  async setupUsers(count: number): Promise<void> {
    console.log(`\n🔧 Setting up ${count} test users for profile scenario...`);
    
    const axiosClient = axios.create({
      baseURL: this.client['client'].defaults.baseURL,
      timeout: 30000
    });

    for (let i = 0; i < count; i++) {
      const email = `loadtest-profile-${Date.now()}-${i}@example.com`;
      const password = `TestPass${i}123!`;
      
      try {
        // Register user
        await axiosClient.post('/api/auth/register', { email, password });
        
        // Login to get token
        const loginResponse = await axiosClient.post('/api/auth/login', {
          email,
          password
        });
        
        const accessToken = loginResponse.data?.accessToken;
        
        if (accessToken) {
          this.testUsers.push({ email, password, accessToken });
        }
      } catch (error) {
        // User might already exist, try to login
        try {
          const loginResponse = await axiosClient.post('/api/auth/login', {
            email,
            password
          });
          
          const accessToken = loginResponse.data?.accessToken;
          if (accessToken) {
            this.testUsers.push({ email, password, accessToken });
          }
        } catch (loginError) {
          console.warn(`Failed to setup user ${i}: ${(loginError as any).message}`);
        }
      }
    }

    console.log(`✓ Setup ${this.testUsers.length}/${count} test users with tokens`);
  }

  /**
   * Get user profile (read operation)
   */
  async getProfile(): Promise<RequestResult> {
    const user = this.testUsers[this.userIndex % this.testUsers.length];
    this.userIndex++;

    if (!user.accessToken) {
      return {
        timestamp: Date.now(),
        duration: 0,
        statusCode: 0,
        success: false,
        error: 'No access token available',
        scenario: 'profile-get',
        endpoint: '/api/users/me'
      };
    }

    return this.client.get(
      '/api/users/me',
      {
        'Authorization': `Bearer ${user.accessToken}`
      },
      'profile-get'
    );
  }

  /**
   * Update user profile (write operation)
   */
  async updateProfile(): Promise<RequestResult> {
    const user = this.testUsers[this.userIndex % this.testUsers.length];
    this.userIndex++;

    if (!user.accessToken) {
      return {
        timestamp: Date.now(),
        duration: 0,
        statusCode: 0,
        success: false,
        error: 'No access token available',
        scenario: 'profile-update',
        endpoint: '/api/users/me'
      };
    }

    const updates = {
      first_name: `FirstName${Math.floor(Math.random() * 1000)}`,
      last_name: `LastName${Math.floor(Math.random() * 1000)}`,
      bio: `This is a test bio updated at ${new Date().toISOString()}`
    };

    return this.client.patch(
      '/api/users/me',
      updates,
      {
        'Authorization': `Bearer ${user.accessToken}`,
        'Content-Type': 'application/json'
      },
      'profile-update'
    );
  }

  /**
   * Mixed profile operations (70% reads, 30% writes)
   */
  async mixed(): Promise<RequestResult> {
    if (Math.random() < 0.7) {
      return this.getProfile();
    } else {
      return this.updateProfile();
    }
  }
}
