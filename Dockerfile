FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p public/uploads database

EXPOSE 3000

CMD ["node", "app.js"]
