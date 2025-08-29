// examples/basic-usage.js
import CDNUploader from '../src/index.js';

// Tạo instance uploader
const uploader = new CDNUploader({
  port: 3000,
  uploadDir: './uploads',
  appUrl: 'https://your-domain.com',
  quality: 80
});

// Khởi động server
uploader.start().then(() => {
  console.log('✅ Server started successfully!');
  console.log('📡 Upload endpoint: http://localhost:3000/upload');
  console.log('🏥 Health check: http://localhost:3000/health');
  console.log('📁 Files served at: http://localhost:3000/files/*');
}).catch(error => {
  console.error('❌ Failed to start server:', error);
});

// Xử lý shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  uploader.stop();
  process.exit(0);
});
