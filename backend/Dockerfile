# ==============================
# ETAPA 1: BUILD
# ==============================

FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY tsconfig*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Prisma 7 puede requerir DATABASE_URL
# para cargar prisma.config.ts durante generate.
# Esta URL solo existe durante el build.
ENV DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"

RUN npm run build


# ==============================
# ETAPA 2: RUNTIME
# ==============================

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated

EXPOSE 3000

CMD ["npm", "start"]
