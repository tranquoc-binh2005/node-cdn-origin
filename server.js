// server.js
import CDNUploader from './src/index.js';

// Cấu hình uploader
const uploader = new CDNUploader({
  port: process.env.PORT || 6868,
  uploadDir: process.env.UPLOAD_DIR || './data',
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 6868}`,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  quality: 50 // WebP quality
});

// Khởi động server
uploader.start().then(() => {
  console.log('🚀 @ateo/cdn-origin server started successfully!');
  console.log(`📁 Upload directory: ${uploader.uploadDir}`);
  console.log(`🌐 App URL: ${uploader.appUrl}`);
  console.log(`🔌 Port: ${uploader.port}`);
  console.log(`📡 Upload endpoint: ${uploader.appUrl}/upload`);
  console.log(`🏥 Health check: ${uploader.appUrl}/health`);
}).catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Xử lý graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  uploader.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  uploader.stop();
  process.exit(0);
});
