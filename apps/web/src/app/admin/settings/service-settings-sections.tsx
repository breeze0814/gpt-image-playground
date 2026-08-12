"use client";

import type { ServiceConfigView } from "@image-playground/core";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StorageView = ServiceConfigView["storage"];
type ImageApiView = ServiceConfigView["imageApi"];
type EmailView = ServiceConfigView["email"];
type PatchHandler<T> = (patch: Partial<T>) => void;
const MIN_SMTP_PORT = 1;
const MAX_SMTP_PORT = 65_535;

interface SecretInputProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly configured: boolean;
  readonly clear: boolean;
  readonly onChange: (value: string) => void;
  readonly onClear: (value: boolean) => void;
}

function SectionHeader({ title, description, ready }: { title: string; description: string; ready: boolean }) {
  const Icon = ready ? CheckCircle2 : AlertCircle;
  return (
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1.5">{description}</CardDescription>
        </div>
        <Badge tone={ready ? "success" : "warning"} className="shrink-0 gap-1">
          <Icon className="size-4" aria-hidden="true" />
          {ready ? "可用" : "待配置"}
        </Badge>
      </div>
    </CardHeader>
  );
}

function SecretInput(props: SecretInputProps) {
  const description = props.configured ? "已加密保存；留空保持原值。" : "尚未保存密钥。";
  function changeValue(value: string): void {
    props.onChange(value);
    if (value && props.clear) props.onClear(false);
  }
  return (
    <div className="grid gap-1">
      <FormField htmlFor={props.id} label={props.label} description={description}>
        <Input
          id={props.id}
          type="password"
          autoComplete="new-password"
          value={props.value}
          placeholder={props.configured ? "输入新值以替换" : "输入密钥"}
          aria-describedby={`${props.id}-message`}
          onChange={(event) => changeValue(event.target.value)}
        />
      </FormField>
      {props.configured && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted-foreground">
          <Checkbox checked={props.clear} onCheckedChange={(checked) => props.onClear(checked === true)} />
          清除已保存的密钥
        </label>
      )}
    </div>
  );
}

function BooleanField({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5" />
      <span className="grid min-w-0 gap-1">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-sm leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function S3Fields({ value, secret, clearSecret, onChange, onSecretChange, onClearSecret }: { value: StorageView; secret: string; clearSecret: boolean; onChange: PatchHandler<StorageView>; onSecretChange: (value: string) => void; onClearSecret: (value: boolean) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField htmlFor="s3-endpoint" label="Endpoint" description="AWS S3 可留空；兼容服务填写包含协议的完整地址。">
        <Input id="s3-endpoint" type="url" value={value.endpoint} placeholder="https://s3.example.com" onChange={(event) => onChange({ endpoint: event.target.value })} />
      </FormField>
      <FormField htmlFor="s3-region" label="Region" description="对象存储所在区域。">
        <Input id="s3-region" value={value.region} placeholder="cn-east-1" onChange={(event) => onChange({ region: event.target.value })} />
      </FormField>
      <FormField htmlFor="s3-bucket" label="Bucket" description="存放上传文件和生成结果。">
        <Input id="s3-bucket" value={value.bucket} placeholder="image-playground" onChange={(event) => onChange({ bucket: event.target.value })} />
      </FormField>
      <FormField htmlFor="s3-access-key" label="Access Key ID" description="对象存储访问标识。">
        <Input id="s3-access-key" autoComplete="off" value={value.accessKeyId} onChange={(event) => onChange({ accessKeyId: event.target.value })} />
      </FormField>
      <div className="sm:col-span-2">
        <SecretInput id="s3-secret-key" label="Secret Access Key" value={secret} configured={value.hasSecretAccessKey} clear={clearSecret} onChange={onSecretChange} onClear={onClearSecret} />
      </div>
      <div className="sm:col-span-2">
        <BooleanField id="s3-path-style" label="使用路径式访问" description="仅在服务商要求 bucket 位于 URL 路径中时启用。" checked={value.forcePathStyle} onChange={(forcePathStyle) => onChange({ forcePathStyle })} />
      </div>
    </div>
  );
}

export function StorageSettingsCard({ value, secret, clearSecret, onChange, onSecretChange, onClearSecret }: { value: StorageView; secret: string; clearSecret: boolean; onChange: PatchHandler<StorageView>; onSecretChange: (value: string) => void; onClearSecret: (value: boolean) => void }) {
  function selectProvider(provider: string): void {
    if (provider === "LOCAL" || provider === "S3") onChange({ provider });
  }
  return (
    <Card>
      <SectionHeader title="文件存储" description="上传图片、任务结果和头像统一使用当前存储，保存后立即切换。" ready={value.ready} />
      <CardContent className="grid gap-4">
        <FormField htmlFor="storage-provider" label="存储提供商" description="本地磁盘适合单机部署；S3 适合多实例部署。">
          <Select value={value.provider} onValueChange={selectProvider}>
            <SelectTrigger id="storage-provider"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="LOCAL">本地磁盘</SelectItem><SelectItem value="S3">S3 兼容对象存储</SelectItem></SelectContent>
          </Select>
        </FormField>
        {value.provider === "LOCAL" ? (
          <>
            <FormField htmlFor="local-storage-path" label="存储目录" description="相对路径以项目根目录为基准；容器部署可使用 /workspace/storage。">
              <Input id="local-storage-path" value={value.localPath} placeholder="./storage" onChange={(event) => onChange({ localPath: event.target.value })} />
            </FormField>
            {value.hasSecretAccessKey && <BooleanField id="clear-inactive-s3-key" label="清除闲置的 S3 密钥" description="当前使用本地存储，清除不会影响文件读写。" checked={clearSecret} onChange={onClearSecret} />}
          </>
        ) : <S3Fields value={value} secret={secret} clearSecret={clearSecret} onChange={onChange} onSecretChange={onSecretChange} onClearSecret={onClearSecret} />}
      </CardContent>
    </Card>
  );
}

export function ImageApiSettingsCard({ value, secret, clearSecret, onChange, onSecretChange, onClearSecret }: { value: ImageApiView; secret: string; clearSecret: boolean; onChange: PatchHandler<ImageApiView>; onSecretChange: (value: string) => void; onClearSecret: (value: boolean) => void }) {
  return (
    <Card>
      <SectionHeader title="图像生成 API" description="Worker 使用这组配置发送文生图和多图编辑请求。" ready={value.ready} />
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField htmlFor="image-api-url" label="基础地址" description="包含协议与公共路径前缀，不包含具体接口路径。">
            <Input id="image-api-url" type="url" value={value.baseUrl} placeholder="https://api.example.com/v1" onChange={(event) => onChange({ baseUrl: event.target.value })} />
          </FormField>
        </div>
        <FormField htmlFor="image-api-model" label="模型" description="传给服务商的模型标识。">
          <Input id="image-api-model" value={value.model} placeholder="image-model" onChange={(event) => onChange({ model: event.target.value })} />
        </FormField>
        <SecretInput id="image-api-key" label="API Key" value={secret} configured={value.hasApiKey} clear={clearSecret} onChange={onSecretChange} onClear={onClearSecret} />
        <FormField htmlFor="generate-path" label="生成接口路径" description="接收 JSON 文生图请求。">
          <Input id="generate-path" value={value.generatePath} placeholder="images/generations" onChange={(event) => onChange({ generatePath: event.target.value })} />
        </FormField>
        <FormField htmlFor="edit-path" label="编辑接口路径" description="接收 multipart/form-data 编辑请求。">
          <Input id="edit-path" value={value.editPath} placeholder="images/edits" onChange={(event) => onChange({ editPath: event.target.value })} />
        </FormField>
      </CardContent>
    </Card>
  );
}

export function EmailSettingsCard({ value, secret, clearSecret, onChange, onSecretChange, onClearSecret }: { value: EmailView; secret: string; clearSecret: boolean; onChange: PatchHandler<EmailView>; onSecretChange: (value: string) => void; onClearSecret: (value: boolean) => void }) {
  return (
    <Card>
      <SectionHeader title="邮件服务" description="用于注册验证码和找回密码邮件；用户名与密码必须同时配置或同时留空。" ready={value.ready} />
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField htmlFor="smtp-host" label="SMTP 主机" description="邮件服务商提供的服务器地址。">
          <Input id="smtp-host" value={value.host} placeholder="smtp.example.com" onChange={(event) => onChange({ host: event.target.value })} />
        </FormField>
        <FormField htmlFor="smtp-port" label="SMTP 端口" description="常用端口为 465 或 587。">
          <Input id="smtp-port" type="number" inputMode="numeric" min={MIN_SMTP_PORT} max={MAX_SMTP_PORT} value={value.port} onChange={(event) => onChange({ port: Number(event.target.value) })} />
        </FormField>
        <FormField htmlFor="smtp-from" label="发件人" description="支持“名称 <address@example.com>”格式。">
          <Input id="smtp-from" value={value.from} placeholder="Image Playground <noreply@example.com>" onChange={(event) => onChange({ from: event.target.value })} />
        </FormField>
        <FormField htmlFor="smtp-user" label="SMTP 用户名" description="无认证 SMTP 可留空。">
          <Input id="smtp-user" autoComplete="off" value={value.user} onChange={(event) => onChange({ user: event.target.value })} />
        </FormField>
        <SecretInput id="smtp-password" label="SMTP 密码" value={secret} configured={value.hasPassword} clear={clearSecret} onChange={onSecretChange} onClear={onClearSecret} />
        <BooleanField id="smtp-secure" label="启用 TLS 直连" description="通常用于 465 端口；587 通常保持关闭并使用 STARTTLS。" checked={value.secure} onChange={(secure) => onChange({ secure })} />
      </CardContent>
    </Card>
  );
}
