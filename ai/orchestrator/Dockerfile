FROM node:20-slim

WORKDIR /app

COPY package.json ./

RUN npm install --no-package-lock
RUN npx playwright install-deps
RUN npx playwright install

COPY . .

CMD ["node", "index.js"]
