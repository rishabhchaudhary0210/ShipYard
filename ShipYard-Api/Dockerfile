# ---------- Builder stage ----------
FROM node:24-bullseye AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV DATABASE_URL="file:/tmp/prisma.db"

RUN npx prisma generate
RUN npm run build


# ---------- Runtime stage ----------
FROM node:24-bullseye

# Install Docker CLI only (NOT daemon)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/debian bullseye stable" \
    > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

# Install pack CLI
RUN curl -fsSL https://github.com/buildpacks/pack/releases/download/v0.39.1/pack-v0.39.1-linux.tgz \
    | tar -C /usr/local/bin --no-same-owner -xz pack

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts .
COPY package.json ./

# Command to be specified when running the container
# To start the API server: npm run start:api
# To start the worker: npm run start:worker