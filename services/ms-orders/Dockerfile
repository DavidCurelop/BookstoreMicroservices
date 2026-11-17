# Base image supplied as build argument (same convention as backend/)
ARG NODE_IMAGE=node:24-alpine
FROM ${NODE_IMAGE}

WORKDIR /usr/src/app

# Install runtime dependencies before copying source to reuse the build cache
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Clickstream log directory; in Kubernetes an emptyDir is mounted here
RUN mkdir -p /var/log/clickstream \
    && chown -R node:node /var/log/clickstream

ENV PORT=5003
EXPOSE 5003

# Run as non-root
USER node

CMD ["node", "server.js"]
