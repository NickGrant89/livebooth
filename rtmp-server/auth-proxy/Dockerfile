FROM node:22-alpine
WORKDIR /app
COPY server.mjs .
ENV AUTH_PROXY_PORT=8091
EXPOSE 8091
CMD ["node", "server.mjs"]
