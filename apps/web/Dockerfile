# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json eslint.config.mjs ./
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter "@carnet/web..." --filter "carnet-cred"

FROM deps AS development
COPY packages/contracts packages/contracts
COPY apps/web apps/web
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @carnet/contracts build && pnpm dev"]

FROM deps AS build
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN pnpm --filter @carnet/contracts build
RUN pnpm --filter @carnet/web build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S carnet && adduser -S carnet -G carnet
COPY --from=build --chown=carnet:carnet /app/apps/web/.next/standalone ./
COPY --from=build --chown=carnet:carnet /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=carnet:carnet /app/apps/web/public ./apps/web/public
USER carnet
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
