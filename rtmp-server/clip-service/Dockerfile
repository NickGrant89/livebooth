FROM node:22-bookworm-slim

RUN apt-get update -qq && apt-get install -y -qq ffmpeg curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server.mjs export-social-clip.sh ./
RUN chmod +x export-social-clip.sh

ENV RECORDINGS_ROOT=/recordings
ENV CLIP_SERVICE_PORT=8093

EXPOSE 8093
CMD ["node", "server.mjs"]
