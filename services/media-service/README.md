# Media Service

Image/avatar upload and processing microservice with background job queue.

## Features

- Avatar upload with validation (size, type)
- Background image processing with BullMQ
- Image resizing and optimization (Sharp)
- Thumbnail generation
- Object storage with MinIO (S3-compatible)
- Job status tracking
- JWT authentication
- Progress updates during processing

## API Endpoints

All endpoints require a valid JWT access token.

### POST /media/avatar
Upload an avatar image for processing.

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Body:**
- `avatar`: Image file (max 5MB, jpeg/png/gif/webp)

**Response (202 Accepted):**
```json
{
  "jobId": "1234567890",
  "message": "Upload successful, processing in background",
  "fileName": "avatars/42/1704067200000-profile.jpg"
}
```

### GET /media/jobs/:jobId
Get the status of an image processing job.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "jobId": "1234567890",
  "status": "completed",
  "progress": 100,
  "result": {
    "originalUrl": "http://localhost:9000/avatars/avatars/42/1704067200000-profile-processed.jpg",
    "thumbnailUrl": "http://localhost:9000/avatars/avatars/42/1704067200000-profile-thumb.jpg",
    "width": 800,
    "height": 600,
    "size": 125480
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "processedAt": "2024-01-01T00:00:05.000Z"
}
```

Status values: `waiting`, `active`, `completed`, `failed`

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "media-service",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 120,
  "checks": {
    "redis": true,
    "minio": true,
    "queue": true
  }
}
```

## Image Processing

The service performs the following operations in the background:

1. **Download** original image from MinIO
2. **Extract metadata** (dimensions, format)
3. **Resize** to max 800x800 (maintains aspect ratio)
4. **Optimize** JPEG quality (85%)
5. **Generate thumbnail** 150x150 (cropped)
6. **Upload** processed images back to MinIO
7. **Return URLs** for both processed image and thumbnail

## Local Development

### Prerequisites
- Node.js 20+
- Redis
- MinIO
- Auth service running (for JWT validation)

### Setup

1. Start infrastructure with Docker:
```bash
cd services/media-service
docker-compose up redis minio -d
```

2. Access MinIO Console at `http://localhost:9001`
   - Username: `minioadmin`
   - Password: `minioadmin`

3. Run in development mode (from project root):
```bash
npm run dev:media
```

The service will be available at `http://localhost:3003`.

## Docker Deployment

### Build and run with Docker Compose:
```bash
cd services/media-service
docker-compose up --build
```

This will start:
- Redis on port 6381
- MinIO on port 9000 (API) and 9001 (Console)
- Media service on port 3003

### Test the service:

```bash
# Get JWT token from auth-service
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.accessToken')

# Upload an avatar
RESPONSE=$(curl -s -X POST http://localhost:3003/media/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/path/to/image.jpg")

echo $RESPONSE

# Extract job ID
JOB_ID=$(echo $RESPONSE | jq -r '.jobId')

# Check job status
curl http://localhost:3003/media/jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"

# Wait a few seconds and check again for completed status
sleep 5
curl http://localhost:3003/media/jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"
```

## Architecture

```
┌─────────────────────────────────────────┐
│        HTTP Upload Request              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  POST /media/avatar (Upload Controller)  │
│  1. Validate file                        │
│  2. Upload to MinIO (original)           │
│  3. Create BullMQ job                    │
│  4. Return jobId (202 Accepted)          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│     BullMQ Queue (Redis-backed)          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Image Processing Worker                 │
│  1. Download from MinIO                  │
│  2. Extract metadata                     │
│  3. Resize & optimize                    │
│  4. Generate thumbnail                   │
│  5. Upload processed images              │
│  6. Update job with results              │
└──────────────────────────────────────────┘
```

## Technologies

- **Express** - HTTP server
- **Multer** - File upload handling
- **Sharp** - High-performance image processing
- **MinIO** - S3-compatible object storage
- **BullMQ** - Background job queue (Redis-backed)
- **JWT** - Authentication

## Environment Variables

Key variables:
- `JWT_SECRET`: Must match auth-service!
- `MINIO_*`: MinIO connection settings
- `MAX_FILE_SIZE`: Max upload size in bytes (default: 5MB)
- `ALLOWED_MIME_TYPES`: Comma-separated list of allowed types

## Why Background Processing?

Image processing is CPU-intensive and slow. By using background jobs:
- ✅ Fast response to user (202 Accepted)
- ✅ Non-blocking operations
- ✅ Retry failed jobs automatically
- ✅ Scale workers independently
- ✅ Progress tracking
- ✅ Better user experience

## Object Storage vs Database

Images are stored in MinIO (not PostgreSQL) because:
- Images are binary blobs (not relational data)
- Better performance for large files
- Cheaper storage
- CDN-compatible
- S3-compatible (easy cloud migration)
