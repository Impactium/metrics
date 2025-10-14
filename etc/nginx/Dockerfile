FROM openresty/openresty:1.25.3.2-0-alpine

RUN apk add --no-cache perl curl git unzip ca-certificates && update-ca-certificates \
 && opm get ledgetech/lua-resty-http

RUN mkdir -p /etc/nginx/lua

COPY etc/nginx/nginx.conf              /etc/nginx/nginx.conf
COPY etc/nginx/conf.d/default.conf     /etc/nginx/conf.d/default.conf
COPY etc/nginx/conf.d/metrics.inc      /etc/nginx/conf.d/metrics.inc
COPY etc/nginx/metrics_logger.lua      /etc/nginx/lua/metrics_logger.lua
COPY etc/nginx/files.conf etc/nginx/proxy.conf  /etc/nginx/

CMD ["openresty", "-g", "daemon off;"]
