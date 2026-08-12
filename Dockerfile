FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
RUN pnpm db:generate
RUN pnpm build

FROM base AS web
ENV NODE_ENV=production
COPY --from=builder /workspace /workspace
EXPOSE 3000
CMD ["pnpm", "--filter", "@image-playground/web", "start"]

FROM base AS worker
ENV NODE_ENV=production
COPY --from=builder /workspace /workspace
CMD ["pnpm", "--filter", "@image-playground/worker", "start"]
