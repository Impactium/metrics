FROM nginx:alpine

RUN apk add --no-cache bash gettext

COPY etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY etc/nginx/files.conf etc/nginx/proxy.conf  /etc/nginx/

CMD ["nginx", "-g", "daemon off;"]
