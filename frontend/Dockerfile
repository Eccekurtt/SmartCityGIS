# ---- Derleme aşaması ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Giriş sayfasında demo hesap ipuçlarını göstermek için (yalnızca demo dağıtımında true).
ARG VITE_SHOW_DEMO=false
ENV VITE_SHOW_DEMO=$VITE_SHOW_DEMO

RUN npm run build

# ---- Sunum aşaması: nginx statik dosyaları sunar, /api isteklerini API'ye iletir ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
