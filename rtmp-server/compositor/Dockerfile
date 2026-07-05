FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server.mjs ./

ENV COMPOSITOR_PORT=8090
EXPOSE 8090

CMD ["node", "server.mjs"]
