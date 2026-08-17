# 可按构建环境替换基础镜像仓库，不影响 Dockerfile 其余阶段。
ARG NODE_IMAGE=node:24-alpine
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# CI 模式下 pnpm 不会在无 TTY 环境询问是否清空模块目录
ENV CI=true
ARG NPM_REGISTRY=https://registry.npmjs.org
ARG PNPM_VERSION=11.9.0
# Corepack 与 pnpm 共用 registry，且所有阶段都继承已安装的 pnpm。
RUN corepack enable \
  && COREPACK_NPM_REGISTRY="$NPM_REGISTRY" corepack install --global "pnpm@$PNPM_VERSION" \
  && pnpm config set store-dir /pnpm/store \
  && pnpm config set registry "$NPM_REGISTRY"
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
# Windows 宿主上 .dockerignore 的嵌套模式匹配不可靠，
# 显式排除 node_modules、构建产物与密钥文件
COPY --exclude=**/node_modules --exclude=**/.next --exclude=**/.next-dev \
     --exclude=.git --exclude=.env --exclude=.env.* --exclude=*.log \
     --exclude=coverage --exclude=.tmp-* --exclude=.hallmark/** . .
RUN pnpm db:generate
RUN pnpm build

# 生产依赖中间阶段：不拷贝 dev 版 node_modules，用 store 做纯生产安装，
# 再补回与当前依赖图匹配的 Prisma 生成产物。
FROM base AS production-deps
ENV NODE_ENV=production
COPY --from=builder /pnpm/store /pnpm/store
COPY --from=builder --exclude=**/node_modules --exclude=**/.next-dev /workspace /workspace
WORKDIR /workspace
COPY --from=builder /workspace/node_modules/.pnpm/@prisma+client@* /staging-prisma-client
RUN pnpm install --frozen-lockfile --prod --prefer-offline \
  && SOURCE_DIR=$(find /staging-prisma-client -type d -name .prisma | head -n 1) \
  && TARGET_DIR=$(find node_modules/.pnpm -mindepth 1 -maxdepth 1 -type d -name '@prisma+client*' | head -n 1) \
  && [ -n "$SOURCE_DIR" ] && [ -n "$TARGET_DIR" ] \
  && rm -rf "$TARGET_DIR/node_modules/.prisma" \
  && cp -a "$SOURCE_DIR" "$TARGET_DIR/node_modules/.prisma" \
  && test -f "$TARGET_DIR/node_modules/.prisma/client/schema.prisma" \
  && test -n "$(find "$TARGET_DIR/node_modules/.prisma/client" -maxdepth 1 -name 'libquery_engine-*.so.node' -print -quit)" \
  && rm -rf /staging-prisma-client /pnpm/store

FROM base AS web
ENV NODE_ENV=production
COPY --from=production-deps /workspace /workspace
WORKDIR /workspace/apps/web
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]

FROM base AS worker
ENV NODE_ENV=production
COPY --from=production-deps --exclude=**/.next /workspace /workspace
WORKDIR /workspace/apps/worker
# 构建期已用 esbuild 打包，运行时不再依赖 tsx 与 ESM 互操作
CMD ["node", "dist/index.cjs"]
