FROM oven/bun:1
WORKDIR /src
COPY package.json bun.lock* ./
RUN bun install
COPY . .
ENV DOCKER=true
EXPOSE 5173
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0"]