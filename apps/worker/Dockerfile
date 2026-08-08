FROM node:20-slim AS builder

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy worker package manifest
COPY package.json ./

# Install Node dependencies
RUN npm install

# Copy worker source code
COPY . ./

# Build worker
RUN npm run build

FROM node:20-slim AS runner

# Install FFmpeg in runner stage
RUN apt-get update && apt-get install -y \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV IS_DOCKER=true

COPY --from=builder /app ./

EXPOSE 8080

CMD ["npm", "start"]
