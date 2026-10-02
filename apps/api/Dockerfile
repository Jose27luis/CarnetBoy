# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json eslint.config.mjs ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
COPY packages/clinical/package.json packages/clinical/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter "@carnet/api..." --filter "carnet-cred"

FROM deps AS development
COPY packages/contracts packages/contracts
COPY packages/clinical packages/clinical
COPY apps/api apps/api
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @carnet/contracts build && pnpm --filter @carnet/clinical build && pnpm exec prisma migrate deploy && pnpm dev"]

FROM deps AS build
COPY packages/contracts packages/contracts
COPY packages/clinical packages/clinical
COPY apps/api apps/api
RUN pnpm --filter @carnet/contracts build
RUN pnpm --filter @carnet/clinical build
RUN pnpm --filter @carnet/api build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
COPY packages/clinical/package.json packages/clinical/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod --filter "@carnet/api..."
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
RUN pnpm --filter @carnet/api exec prisma generate

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache openssl \
    && addgroup -S carnet \
    && adduser -S carnet -G carnet
COPY --from=prod-deps --chown=carnet:carnet /app/package.json ./package.json
COPY --from=prod-deps --chown=carnet:carnet /app/node_modules ./node_modules
COPY --from=prod-deps --chown=carnet:carnet /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=carnet:carnet /app/apps/api/package.json ./apps/api/package.json
COPY --from=prod-deps --chown=carnet:carnet /app/apps/api/prisma ./apps/api/prisma
COPY --from=prod-deps --chown=carnet:carnet /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=build --chown=carnet:carnet /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=carnet:carnet /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=carnet:carnet /app/packages/clinical/package.json ./packages/clinical/package.json
COPY --from=build --chown=carnet:carnet /app/packages/clinical/dist ./packages/clinical/dist
COPY --from=build --chown=carnet:carnet /app/apps/api/dist ./apps/api/dist
COPY --chown=carnet:carnet apps/api/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
USER carnet
WORKDIR /app/apps/api
EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/main.js"]
