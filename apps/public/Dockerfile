FROM node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/public/package.json apps/public/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/api-client/package.json packages/api-client/package.json
RUN npm ci --workspace apps/public
COPY apps/public apps/public
RUN npm --workspace apps/public run build

EXPOSE 3000
CMD ["npm", "--workspace", "apps/public", "run", "start"]
