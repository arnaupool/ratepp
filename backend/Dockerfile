FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

EXPOSE 4000

CMD ["sh", "-c", "node src/migrate.js && node src/index.js"]
