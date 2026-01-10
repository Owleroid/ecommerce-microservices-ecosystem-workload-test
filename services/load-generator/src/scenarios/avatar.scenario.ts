import { HttpClient } from '../utils/http-client';
import { TestUser, RequestResult } from '../types';
import axios from 'axios';
import FormData from 'form-data';

export class AvatarScenario {
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
    console.log(`\n🔧 Setting up ${count} test users for avatar scenario...`);
    
    const axiosClient = axios.create({
      baseURL: this.client['client'].defaults.baseURL,
      timeout: 30000
    });

    for (let i = 0; i < count; i++) {
      const email = `loadtest-avatar-${Date.now()}-${i}@example.com`;
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
   * Generate a test image buffer (simple PNG)
   */
  private generateTestImage(size: 'small' | 'medium' | 'large' = 'medium'): Buffer {
    // PNG signature + simple image data
    const sizes = {
      small: 1024,      // 1KB
      medium: 51200,    // 50KB
      large: 512000     // 500KB
    };

    const imageSize = sizes[size];
    
    // Create a simple buffer that could pass as an image
    // In reality, we're just creating random data
    // A real PNG would have proper headers and structure
    const buffer = Buffer.alloc(imageSize);
    
    // PNG signature
    buffer.write('\x89PNG\r\n\x1a\n', 0);
    
    // Fill with semi-random data
    for (let i = 8; i < imageSize; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    
    return buffer;
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(imageSize: 'small' | 'medium' | 'large' = 'medium'): Promise<RequestResult> {
    const user = this.testUsers[this.userIndex % this.testUsers.length];
    this.userIndex++;

    if (!user.accessToken) {
      return {
        timestamp: Date.now(),
        duration: 0,
        statusCode: 0,
        success: false,
        error: 'No access token available',
        scenario: 'avatar-upload',
        endpoint: '/api/media/avatar'
      };
    }

    const formData = new FormData();
    const imageBuffer = this.generateTestImage(imageSize);
    
    formData.append('avatar', imageBuffer, {
      filename: `test-avatar-${Date.now()}.png`,
      contentType: 'image/png'
    });

    return this.client.postMultipart(
      '/api/media/avatar',
      formData,
      {
        'Authorization': `Bearer ${user.accessToken}`
      },
      'avatar-upload'
    );
  }

  /**
   * Check upload status (poll for job completion)
   */
  async checkStatus(jobId: string, accessToken: string): Promise<RequestResult> {
    return this.client.get(
      `/api/media/status/${jobId}`,
      {
        'Authorization': `Bearer ${accessToken}`
      },
      'avatar-status'
    );
  }

  /**
   * Mixed avatar operations
   */
  async mixed(): Promise<RequestResult> {
    // Vary image sizes
    const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    
    return this.uploadAvatar(size);
  }
}
