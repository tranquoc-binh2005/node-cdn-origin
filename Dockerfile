FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build || echo "No build script found"

FROM node:20-alpine AS runtime
WORKDIR /app

# Cài đặt dependencies cần thiết cho sharp
RUN apk add --no-cache \
    vips-dev \
    build-base \
    python3

# Tạo user non-root để chạy ứng dụng
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy dependencies và source code
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app ./

# Tạo thư mục data và logs
RUN mkdir -p /app/data /app/logs && \
    chown -R nodejs:nodejs /app

# Chuyển sang user non-root
USER nodejs

# Expose port
EXPOSE 6868

# Mount volumes cho dữ liệu và logs
VOLUME ["/app/data", "/app/logs"]

# Start application
CMD ["node", "server.js"]
