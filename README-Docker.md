# Hướng dẫn chạy project với Docker

## Yêu cầu
- Docker
- Docker Compose

## Cách chạy

### 1. Build và chạy với Docker Compose (Khuyến nghị)
```bash
# Build và chạy project
docker-compose up --build

# Chạy ở background
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Dừng project
docker-compose down
```

### 2. Chạy với Docker trực tiếp
```bash
# Build image
docker build -t node-cdn-origin .

# Chạy container
docker run -d \
  --name cdn-origin \
  -p 6868:6868 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  node-cdn-origin

# Xem logs
docker logs -f cdn-origin

# Dừng container
docker stop cdn-origin
docker rm cdn-origin
```

## Cấu trúc thư mục
```
.
├── data/           # Thư mục chứa dữ liệu upload (được mount vào container)
├── logs/           # Thư mục chứa log files (được mount vào container)
├── Dockerfile      # Cấu hình Docker image
├── docker-compose.yml  # Cấu hình Docker Compose
└── .dockerignore   # Danh sách file bỏ qua khi build
```

## Tính năng
- ✅ Multi-stage build để tối ưu kích thước image
- ✅ Volume mounting cho data và logs
- ✅ User non-root để bảo mật
- ✅ Dependencies cần thiết cho Sharp (image processing)
- ✅ Auto-restart khi container crash
- ✅ Network isolation

## Kiểm tra ứng dụng
Sau khi chạy thành công, truy cập:
- **Health check**: http://localhost:6868/health
- **Upload endpoint**: POST http://localhost:6868/upload

## Troubleshooting

### Nếu gặp lỗi permission
```bash
# Tạo thư mục với quyền đúng
mkdir -p data logs
chmod 755 data logs
```

### Nếu cần rebuild
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Xem logs chi tiết
```bash
docker-compose logs -f cdn-origin
```
