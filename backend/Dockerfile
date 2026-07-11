# ---- deps: install once, cached separately from your source code ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build: compile TypeScript -> dist/, using devDependencies (tsc, @types/*) ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# at this point dist/ exists (your "build": "tsc" script) — this stage's node_modules
# still has devDependencies, which we deliberately do NOT ship to production

# ---- production deps only: no ts-node, no typescript, no @types/* in the final image ----
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- final: smallest possible image, only what's needed to actually run ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

# Postgres SSL (Neon) needs this at runtime in some minimal images — cheap insurance
#RUN apk add --no-cache ca-certificates

EXPOSE 5000
CMD ["node", "dist/server.js"]
