FROM node:18-alpine
WORKDIR /app
# Copy tất cả mọi thứ trong thư mục demo-app vào trong /app của container
COPY . . 
RUN npm install --production
EXPOSE 3000
CMD ["npm", "start"]
