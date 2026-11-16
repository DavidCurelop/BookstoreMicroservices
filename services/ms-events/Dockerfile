# Base image supplied as build argument (same convention as backend/)
ARG NODE_IMAGE=node:24-alpine
FROM ${NODE_IMAGE}

WORKDIR /usr/src/app

# Install runtime dependencies before copying source to reuse the build cache
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Shared clickstream log directory; in Kubernetes the EFS volume
# (bookstore-logs-pvc) is mounted here
RUN mkdir -p /usr/src/app/logs \
    && chown -R node:node /usr/src/app/logs

ENV PORT=5004
EXPOSE 5004

# Run as non-root
USER node

CMD ["node", "server.js"]
