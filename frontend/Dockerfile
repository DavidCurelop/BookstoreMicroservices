# Base images supplied as build arguments
ARG NODE_IMAGE
ARG NGINX_IMAGE

# Build stage: install dependencies and compile React with Vite
FROM ${NODE_IMAGE} AS builder

# Set the work directory
WORKDIR /app

# Install dependencies before copying source code to reuse the build cache
COPY package*.json ./
RUN npm ci

COPY . .

# Configuration available during frontend compilation
ARG VITE_API_BASE_URL
ARG VITE_API_PREFIX
ARG VITE_CURRENCY_LOCALE
ARG VITE_CURRENCY_CODE

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_PREFIX=${VITE_API_PREFIX}
ENV VITE_CURRENCY_LOCALE=${VITE_CURRENCY_LOCALE}
ENV VITE_CURRENCY_CODE=${VITE_CURRENCY_CODE}

# Generate static assets in /app/dist
RUN npm run build

# Runtime stage: serve the compiled SPA with Nginx
FROM ${NGINX_IMAGE}

# Copy compiled assets and the Nginx reverse proxy configuration template
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
