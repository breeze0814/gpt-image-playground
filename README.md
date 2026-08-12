# Image Playground

基于 Next.js、PostgreSQL、Redis、S3 兼容对象存储和自定义图像 API 的文生图与多图修图平台，包含 C 端积分体系和管理端。

## 本地启动

1. 复制 `.env.example` 为 `.env`，配置数据库、Redis、Better Auth 与管理员初始化信息。
2. 启动基础设施：`docker compose up -d postgres redis`。
3. 执行迁移与种子：`pnpm db:deploy && pnpm db:seed`。
4. 启动 Web 与 Worker：`pnpm dev`。
5. 使用初始化的管理员账号登录，在“系统配置 → 服务接入”中配置文件存储、图像 API 和邮件服务。

Web 默认地址为 http://localhost:3000。`pnpm db:seed` 会使用 `ADMIN_EMAIL`、`ADMIN_NAME` 和 `ADMIN_PASSWORD` 创建管理员；`ADMIN_PASSWORD` 仅用于首次建立凭据，重复执行不会覆盖管理员后来重置的密码。

## 服务配置

S3、图像 API 与 SMTP 配置保存在数据库的 `AppSetting` 中，不从运行时环境变量读取。Access Key、API Key 和 SMTP 密码使用 AES-256-GCM 加密；管理接口只返回“是否已配置”，不会返回密钥明文。

`BETTER_AUTH_SECRET` 同时作为服务配置加密根密钥，必须保持稳定。更换它之前需要先在管理后台重新保存所有密钥，否则既有密文无法解密。

图像 API 的生成接口接收 `model`、`prompt`、`size`、`quality`、`output_format` 和 `user`；编辑接口接收同名表单字段，并通过重复的 `image` 字段接收主图与参考图。两个接口均须返回以下 JSON，图片内容必须是 WebP 的 Base64 数据：

```json
{
  "data": [{ "b64_json": "..." }],
  "request_id": "optional-request-id"
}
```

接口配置缺失、返回非 2xx 或响应不符合契约时，任务会明确失败并退回冻结积分。

## 旧配置迁移

升级前若 `.env` 中仍有 `S3_*`、`IMAGE_API_*` 或 `SMTP_*`，先执行 `pnpm config:migrate`。迁移命令会校验配置完整性、加密密钥并写入数据库；成功后应删除这些服务环境变量。没有旧配置时，命令会明确报错且不会改写数据库。

## Docker 部署

执行 `docker compose up -d --build`。若在管理后台选择本地存储，将目录设置为 `/workspace/storage`，Web 和 Worker 会使用共享的 `asset-data` 持久卷；选择 S3 时不依赖该卷。
