import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { RequestResult } from '../types';

export class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      validateStatus: () => true // Don't throw on any status code
    });
  }

  async request(
    method: string,
    url: string,
    data?: any,
    headers?: Record<string, string>,
    scenario: string = 'unknown'
  ): Promise<RequestResult> {
    const startTime = Date.now();
    
    try {
      const response: AxiosResponse = await this.client.request({
        method,
        url,
        data,
        headers
      });

      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 400;

      return {
        timestamp: startTime,
        duration,
        statusCode: response.status,
        success,
        error: success ? undefined : response.data?.error?.message || `HTTP ${response.status}`,
        scenario,
        endpoint: url
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        timestamp: startTime,
        duration,
        statusCode: error.response?.status || 0,
        success: false,
        error: error.message || 'Request failed',
        scenario,
        endpoint: url
      };
    }
  }

  async get(url: string, headers?: Record<string, string>, scenario?: string): Promise<RequestResult> {
    return this.request('GET', url, undefined, headers, scenario);
  }

  async post(url: string, data: any, headers?: Record<string, string>, scenario?: string): Promise<RequestResult> {
    return this.request('POST', url, data, headers, scenario);
  }

  async patch(url: string, data: any, headers?: Record<string, string>, scenario?: string): Promise<RequestResult> {
    return this.request('PATCH', url, data, headers, scenario);
  }

  async postMultipart(
    url: string,
    formData: any,
    headers?: Record<string, string>,
    scenario?: string
  ): Promise<RequestResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.post(url, formData, {
        headers: {
          ...headers,
          ...formData.getHeaders?.()
        }
      });

      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 400;

      return {
        timestamp: startTime,
        duration,
        statusCode: response.status,
        success,
        error: success ? undefined : response.data?.error?.message || `HTTP ${response.status}`,
        scenario: scenario || 'unknown',
        endpoint: url
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        timestamp: startTime,
        duration,
        statusCode: error.response?.status || 0,
        success: false,
        error: error.message || 'Request failed',
        scenario: scenario || 'unknown',
        endpoint: url
      };
    }
  }
}
