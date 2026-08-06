FROM node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/public/package.json apps/public/package.json
COPY packages/api-client/package.json packages/api-client/package.json
RUN npm config set fetch-retries 3 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set fetch-retry-maxtimeout 60000 \
    && npm ci --workspace apps/admin
COPY packages/api-client packages/api-client
COPY apps/admin apps/admin

EXPOSE 5173
CMD ["npm", "--workspace", "apps/admin", "run", "dev", "--", "--host", "0.0.0.0"]
