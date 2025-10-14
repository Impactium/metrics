FROM nginx:alpine

RUN apk add --no-cache \
      nginx-mod-http-ndk \
      nginx-mod-http-lua \
      lua-resty-http \
      lua-resty-core \
      lua-resty-lrucache \
      lua-cjson \
      ca-certificates && update-ca-certificates

RUN mkdir -p /etc/nginx/lua

COPY etc/nginx/nginx.conf              /etc/nginx/nginx.conf
COPY etc/nginx/conf.d/default.conf     /etc/nginx/conf.d/default.conf
COPY etc/nginx/conf.d/metrics.inc      /etc/nginx/conf.d/metrics.inc
COPY etc/nginx/metrics_logger.lua      /etc/nginx/lua/metrics_logger.lua
COPY etc/nginx/files.conf etc/nginx/proxy.conf  /etc/nginx/

CMD ["nginx", "-g", "daemon off;"]
