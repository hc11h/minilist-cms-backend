# Multi-stage build for NestJS application
FROM node:20-alpine AS builder

WORKDIR /app


COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM node:20-alpine AS production

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["yarn", "start:prod"]

