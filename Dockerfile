FROM node:18-alpine

# Cài đặt timezone (Tùy chọn)
RUN apk add --no-cache tzdata
ENV TZ=Asia/Ho_Chi_Minh

# Thư mục làm việc trong container
WORKDIR /app

# Copy file định nghĩa package và cài đặt thư viện
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Expose cổng 5000
EXPOSE 5000

# Chạy ứng dụng
CMD ["npm", "start"]
