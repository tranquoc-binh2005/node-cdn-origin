# 🖼️ Node.js Image Upload Server

Một server Node.js để upload ảnh với khả năng nén theo chất lượng và chuyển đổi sang định dạng WebP.

## ✨ Tính năng

- **Upload ảnh** với giới hạn 50MB
- **Nén ảnh** theo % chất lượng (1-100%)
- **Chuyển đổi WebP** tự động
- **Hỗ trợ nhiều định dạng**: JPEG, PNG, GIF, BMP, WebP
- **Tạo hash** cho tên file để tránh trùng lặp
- **Tổ chức thư mục** với prefix tùy chọn
- **Cache headers** thông minh cho CDN
- **Giao diện web** demo để test

## 🚀 Cài đặt

```bash
# Clone repository
git clone <your-repo>
cd node-cdn-origin

# Cài đặt dependencies
npm install

# Tạo thư mục upload (mặc định: /data)
mkdir -p /data

# Chạy server
npm start
```

## 🔧 Cấu hình

### Environment Variables

```bash
# Thư mục lưu trữ ảnh
UPLOAD_DIR=/data

# Port server (mặc định: 3000)
PORT=3000

# URL cơ sở công khai (để tạo link download)
PUBLIC_BASE_URL=https://your-domain.com
```

## 📡 API Endpoints

### POST /upload

Upload ảnh với các tùy chọn nén và chuyển đổi.

**Form Data:**
- `file`: File ảnh (bắt buộc)
- `quality`: Chất lượng ảnh 1-100% (mặc định: 100)
- `convertToWebP`: Chuyển đổi sang WebP (true/false)
- `prefix`: Thư mục con (tùy chọn)

**Response:**
```json
{
  "key": "avatars/a1b2c3d4e5f6g7h8.jpg",
  "publicUrl": "https://your-domain.com/files/avatars/a1b2c3d4e5f6g7h8.jpg",
  "originalSize": 1024000,
  "processedSize": 512000,
  "compressionRatio": 50,
  "quality": 80,
  "format": "jpg",
  "dimensions": {
    "width": 1920,
    "height": 1080
  }
}
```

### GET /files/{key}

Download ảnh đã upload.

### GET /health

Kiểm tra trạng thái server.

## 🎯 Ví dụ sử dụng

### Upload ảnh với nén 80%
```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@image.jpg" \
  -F "quality=80"
```

### Upload và chuyển đổi sang WebP
```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@image.jpg" \
  -F "quality=90" \
  -F "convertToWebP=true"
```

### Upload vào thư mục con
```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@image.jpg" \
  -F "prefix=products"
```

## 🌐 Giao diện Web

Truy cập `http://localhost:3000` để sử dụng giao diện web demo với:

- Chọn file ảnh
- Điều chỉnh chất lượng nén
- Tùy chọn chuyển đổi WebP
- Xem preview và thống kê
- Tổ chức thư mục

## 📁 Cấu trúc thư mục

```
node-cdn-origin/
├── src/
│   └── server.js          # Server chính
├── public/
│   └── index.html         # Giao diện demo
├── /data/                 # Thư mục lưu ảnh (tự tạo)
├── package.json
└── README.md
```

## 🔒 Bảo mật

- Chỉ chấp nhận file ảnh (MIME type validation)
- Giới hạn kích thước file (50MB)
- Tạo hash cho tên file để tránh path traversal
- Sanitize prefix input

## 📊 Hiệu suất

- Sử dụng Sharp library cho xử lý ảnh nhanh
- Cache headers thông minh cho CDN
- Lưu trữ file theo hash để tối ưu cache
- Hỗ trợ concurrent uploads

## 🛠️ Development

```bash
# Chạy với nodemon (cần cài đặt)
npm install -g nodemon
nodemon src/server.js

# Chạy tests (nếu có)
npm test
```

## 📝 License

MIT License
