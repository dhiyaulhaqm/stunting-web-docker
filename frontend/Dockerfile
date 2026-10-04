FROM node:22-alpine AS build

WORKDIR /app

COPY source/frontend/package.json source/frontend/package-lock.json ./
RUN npm ci

COPY source/frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
