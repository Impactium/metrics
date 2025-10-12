FROM node:23-alpine
RUN npm install -g pnpm@latest
WORKDIR /client
COPY . .
RUN pnpm -r install
RUN pnpm -r run build
