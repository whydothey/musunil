FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm check

ENV NODE_ENV=production
CMD ["pnpm", "start:api"]
