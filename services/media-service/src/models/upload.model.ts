export interface UploadJobData {
  userId: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface ProcessedImageData {
  originalUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  size: number;
}

export interface UploadResponse {
  jobId: string;
  message: string;
  fileName: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress?: number;
  result?: ProcessedImageData;
  error?: string;
  createdAt?: Date;
  processedAt?: Date;
}
