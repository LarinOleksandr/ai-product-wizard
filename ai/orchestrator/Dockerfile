FROM node:20-slim

WORKDIR /app

COPY package.json ./

RUN npm install --no-package-lock

COPY . .

CMD ["node", "index.js"]
