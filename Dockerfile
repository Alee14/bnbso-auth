FROM oven/bun:latest

WORKDIR /app

COPY bun.lockb .
COPY package.json .

RUN bun install

COPY . .

ENTRYPOINT ["bun", "start"]
