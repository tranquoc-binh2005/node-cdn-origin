FROM node:18-alpine

# Cài đặt dependencies cần thiết cho Sharp
RUN apk add --no-cache \
    vips-dev \
    build-base \
    python3

# Tạo thư mục làm việc
WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt tất cả dependencies (bao gồm devDependencies để build)
RUN npm ci

# Copy source code và build
COPY . .
RUN npm run build

# Xóa devDependencies sau khi build để giảm kích thước image
RUN npm prune --production

# Tạo thư mục data
RUN mkdir -p /app/data

# Expose port
EXPOSE 6868

# Start server
CMD ["node", "server.js"]
