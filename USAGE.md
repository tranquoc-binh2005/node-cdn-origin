# @ateo/cdn-origin - Hướng dẫn sử dụng

## 📦 Cài đặt

```bash
npm install @ateo/cdn-origin
```

## 🚀 Cách sử dụng cơ bản

### 🎯 Simple Upload (Khuyến nghị)

```javascript
import { upload } from '@ateo/cdn-origin';

// Upload từ Buffer
const imageBuffer = fs.readFileSync('./image.jpg');
const result = await upload(imageBuffer, {
  uploadDir: './uploads',
  appUrl: 'https://your-domain.com',
  filename: 'my-image.jpg'
});

console.log('Original URL:', result.original.url);
console.log('Compressed URL:', result.compressed.url);
```

### 🚀 Upload từ file path

```javascript
import { upload } from '@ateo/cdn-origin';

// Upload từ file path
const result = await upload('./path/to/image.jpg', {
  uploadDir: './uploads',
  appUrl: 'https://your-domain.com'
});

console.log('Upload successful!', result);
```

### 📁 Upload multiple files

```javascript
import { uploadMultiple } from '@ateo/cdn-origin';

const results = await uploadMultiple([
  './image1.jpg',
  './image2.png',
  './image3.gif'
], {
  uploadDir: './uploads',
  appUrl: 'https://your-domain.com'
});

results.forEach(result => {
  if (result.success) {
    console.log('✅', result.original.url);
  } else {
    console.log('❌', result.error);
  }
});
```

### 1. Khởi tạo và chạy server độc lập

```javascript
import CDNUploader from '@ateo/cdn-origin';

// Tạo instance uploader
const uploader = new CDNUploader({
  port: 3000,
  uploadDir: './uploads',
  appUrl: 'https://your-domain.com'
});

// Khởi động server
await uploader.start();
console.log('Server started on port 3000');
```

### 2. Tích hợp vào Express app

```javascript
import express from 'express';
import { createUploader } from '@ateo/cdn-origin';

const app = express();
const uploader = createUploader({
  uploadDir: './uploads',
  appUrl: 'https://your-domain.com'
});

// Mount uploader routes vào path /cdn
app.use('/cdn', uploader.getApp());

// Thêm routes khác của bạn
app.get('/', (req, res) => {
  res.send('Welcome to my app!');
});

app.listen(3000, () => {
  console.log('App running on port 3000');
  console.log('CDN uploader available at /cdn/upload');
});
```

### 3. Sử dụng với instance

```javascript
import CDNUploader from '@ateo/cdn-origin';

const uploader = new CDNUploader({
  uploadDir: './uploads',
  appUrl: 'https://your-domain.com'
});

// Upload single file
const result = await uploader.upload('./image.jpg');

// Upload multiple files
const results = await uploader.uploadMultiple([
  './image1.jpg',
  './image2.png'
]);

// Upload từ Buffer
const buffer = fs.readFileSync('./image.jpg');
const result2 = await uploader.upload(buffer, {
  filename: 'custom-name.jpg'
});
```

## ⚙️ Cấu hình

### Constructor Options

```javascript
const uploader = new CDNUploader({
  uploadDir: './data',           // Thư mục lưu trữ (default: './data')
  port: 6868,                    // Port server (default: 6868)
  appUrl: 'https://cdn.example.com', // URL cơ sở (default: 'http://localhost:6868')
  maxFileSize: 50 * 1024 * 1024,    // Kích thước file tối đa (default: 50MB)
  quality: 50                        // Chất lượng WebP (default: 50)
});
```

### Upload Options

```javascript
const result = await upload(file, {
  filename: 'custom-name.jpg',    // Tên file tùy chỉnh
  mimetype: 'image/jpeg',         // MIME type
  prefix: 'avatars',              // Prefix cho thư mục
  uploadDir: './uploads',         // Thư mục upload
  appUrl: 'https://your-domain.com' // URL cơ sở
});
```

### Environment Variables

```bash
# Thư mục upload
UPLOAD_DIR=./uploads

# Port server
PORT=3000

# URL cơ sở cho links
APP_URL=https://your-domain.com

# Kích thước file tối đa (bytes)
MAX_FILE_SIZE=52428800

# Chất lượng WebP
WEBP_QUALITY=80
```

## 📡 API Endpoints

### POST /upload
Upload ảnh lên server.

**Form Data:**
- `file`: File ảnh (bắt buộc)
- `prefix`: Prefix cho thư mục (tùy chọn)

**Response:**
```json
{
  "success": true,
  "httpcode": 200,
  "original": {
    "url": "https://your-domain.com/files/storage/quality/2025-01-20/14/abc123def456.jpg"
  },
  "compressed": {
    "url": "https://your-domain.com/files/storage/low/2025-01-20/14/abc123def456.webp"
  },
  "hash": "abc123def456",
  "datePath": "2025-01-20",
  "timePath": "14"
}
```

### GET /health
Kiểm tra trạng thái server.

**Response:**
```json
{
  "ok": true
}
```

### GET /files/*
Serve static files với cache headers tối ưu.

## 🗂️ Cấu trúc thư mục

```
uploads/
├── storage/
│   ├── quality/           # Ảnh gốc (100% chất lượng)
│   │   └── 2025-01-20/   # Thư mục theo ngày
│   │       └── 14/       # Thư mục theo giờ
│   │           └── abc123def456.jpg
│   └── low/              # Ảnh nén WebP
│       └── 2025-01-20/
│           └── 14/
│               └── abc123def456.webp
```

## 🔧 Tích hợp với các framework

### Next.js API Route

```javascript
// pages/api/upload.js
import { upload } from '@ateo/cdn-origin';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await upload(req.file.buffer, {
      uploadDir: './public/uploads',
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Nuxt.js Server Middleware

```javascript
// server-middleware/cdn-uploader.js
import { createUploader } from '@ateo/cdn-origin';

export default function (req, res, next) {
  const uploader = createUploader({
    uploadDir: './static/uploads',
    appUrl: process.env.APP_URL
  });

  // Mount uploader routes
  if (req.url.startsWith('/cdn')) {
    return uploader.getApp()(req, res, next);
  }

  next();
}
```

### Fastify Plugin

```javascript
// plugins/cdn-uploader.js
import fp from 'fastify-plugin';
import { createUploader } from '@ateo/cdn-origin';

export default fp(async function (fastify, options) {
  const uploader = createUploader({
    uploadDir: './uploads',
    appUrl: options.appUrl
  });

  // Mount uploader routes
  fastify.register(uploader.getApp(), { prefix: '/cdn' });
});
```

## 🐳 Docker

### Build và chạy

```bash
# Build image
docker build -t cdn-uploader .

# Chạy container
docker run -d \
  --name cdn-uploader \
  -p 6868:6868 \
  -v $(pwd)/uploads:/app/data \
  -e APP_URL=https://your-domain.com \
  cdn-uploader
```

### Docker Compose

```yaml
version: '3.8'
services:
  cdn-uploader:
    build: .
    ports:
      - "6868:6868"
    environment:
      - PORT=6868
      - UPLOAD_DIR=/app/data
      - APP_URL=https://your-domain.com
    volumes:
      - ./uploads:/app/data
    restart: unless-stopped
```

## 📊 Error Handling

### HTTP Status Codes

- **200**: Upload thành công
- **400**: Lỗi validation (file không hợp lệ, kích thước quá lớn)
- **500**: Lỗi server nội bộ
- **507**: Không đủ dung lượng lưu trữ

### Error Response Format

```json
{
  "success": false,
  "httpcode": 400,
  "error": "File is required"
}
```

## 🔒 Bảo mật

- **File Validation**: Chỉ chấp nhận file ảnh hợp lệ
- **Size Limit**: Giới hạn kích thước file upload
- **Path Sanitization**: Làm sạch input để tránh path traversal
- **Hash Generation**: Tạo hash unique cho tên file

## 📈 Performance

- **Sharp Library**: Xử lý ảnh nhanh và hiệu quả
- **Smart Caching**: Cache headers tối ưu cho CDN
- **Concurrent Processing**: Hỗ trợ upload đồng thời
- **Memory Efficient**: Sử dụng buffer thay vì lưu file tạm

## 🧪 Testing

### Test upload endpoint

```bash
# Test với curl
curl -X POST http://localhost:6868/upload \
  -F "file=@test-image.jpg" \
  -F "prefix=test"

# Test health check
curl http://localhost:6868/health
```

### Test với Postman

1. Tạo POST request đến `http://localhost:6868/upload`
2. Chọn form-data
3. Thêm key `file` với type `File`
4. Chọn file ảnh để upload
5. Gửi request

## 🚀 Production Deployment

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /cdn/ {
        proxy_pass http://localhost:6868/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /files/ {
        proxy_pass http://localhost:6868/files/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'cdn-uploader',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 6868,
      APP_URL: 'https://your-domain.com'
    }
  }]
};
```

## 📝 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

## 🤝 Contributing

Đóng góp luôn được chào đón! Hãy:

1. Fork project
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📞 Support

Nếu bạn gặp vấn đề hoặc có câu hỏi:

- Tạo issue trên GitHub
- Liên hệ qua email: ateo@example.com
- Tham gia Discord community

---

**Made with ❤️ by Ateo**
