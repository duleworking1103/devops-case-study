# Sử dụng base image là node 18 bản nhẹ
FROM node:18-alpine

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app

# Copy cả package.json VÀ server.js vào container
# Làm bước này trước để tận dụng Docker layer cache (npm install chỉ chạy lại khi package.json thay đổi)
COPY package.json ./

# Cài đặt các dependencies (nếu có)
RUN npm install --production

# Copy toàn bộ source code còn lại
COPY . .

# Mở cổng 3000
EXPOSE 3000

# Chạy ứng dụng
CMD ["npm", "start"]
