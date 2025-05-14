FROM node:20

# Установим зависимости для puppeteer + ffmpeg
RUN apt-get update && apt-get install -y \
  ffmpeg \
  chromium \
  libnss3 \
  libatk-bridge2.0-0 \
  libcups2 \
  libxss1 \
  libgtk-3-0 \
  libgbm1 \
  libasound2 \
  libxshmfence1 \
  libglu1 \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

# Создаем директории
WORKDIR /app
COPY . .

# Установка зависимостей
RUN npm install

# Указываем путь к chromium для puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Порт
EXPOSE 8080
CMD ["npm", "start"]
