/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
"use client";

import type { ServiceConfigUpdate, ServiceConfigView } from "@image-playground/core";
import { CheckCircle2, LoaderCircle, Save } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/client-api";
import {
  EmailSettingsCard,
  ImageApiSettingsCard,
  StorageSettingsCard,
} from "./service-settings-sections";

interface SecretDrafts {
  readonly s3: string;
  readonly imageApi: string;
  readonly email: string;
}

interface ClearSecrets {
  readonly s3: boolean;
  readonly imageApi: boolean;
  readonly email: boolean;
}

const EMPTY_SECRETS: SecretDrafts = Object.freeze({ s3: "", imageApi: "", email: "" });
const KEEP_SECRETS: ClearSecrets = Object.freeze({ s3: false, imageApi: false, email: false });

function requestBody(settings: ServiceConfigView, secrets: SecretDrafts, clear: ClearSecrets): ServiceConfigUpdate {
  return {
    storage: {
      provider: settings.storage.provider,
      localPath: settings.storage.localPath,
      endpoint: settings.storage.endpoint,
      region: settings.storage.region,
      bucket: settings.storage.bucket,
      accessKeyId: settings.storage.accessKeyId,
      secretAccessKey: secrets.s3,
      clearSecretAccessKey: clear.s3,
      forcePathStyle: settings.storage.forcePathStyle,
    },
    imageApi: {
      baseUrl: settings.imageApi.baseUrl,
      model: settings.imageApi.model,
      generatePath: settings.imageApi.generatePath,
      editPath: settings.imageApi.editPath,
      apiKey: secrets.imageApi,
      clearApiKey: clear.imageApi,
    },
    email: {
      host: settings.email.host,
      port: settings.email.port,
      secure: settings.email.secure,
      from: settings.email.from,
      user: settings.email.user,
      password: secrets.email,
      clearPassword: clear.email,
    },
  };
}

export function ServiceSettingsForm({ initial }: { initial: ServiceConfigView }) {
  const form = useServiceSettings(initial);
  return (
    <form onSubmit={form.save} className="grid gap-6">
      {!form.settings.configured && (
        <Alert variant="warning">
          <AlertDescription>服务配置尚未初始化。保存后，Web 与 Worker 将直接读取数据库中的配置。</AlertDescription>
        </Alert>
      )}
      <ServiceSettingsCards form={form} />
      <div aria-live="polite" className="grid gap-4">
        {form.message && <Alert variant="success"><CheckCircle2 className="size-4" /><AlertDescription>{form.message}</AlertDescription></Alert>}
        {form.error && <Alert variant="destructive"><AlertDescription>{form.error}</AlertDescription></Alert>}
      </div>
      <Button type="submit" disabled={form.loading} className="w-full sm:w-auto sm:justify-self-start" data-state={form.loading ? "loading" : form.error ? "error" : form.message ? "success" : undefined}>
        {form.loading ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        {form.loading ? "正在保存" : "保存服务配置"}
      </Button>
    </form>
  );
}

function useServiceSettings(initial: ServiceConfigView) {
  const [settings, setSettings] = useState(initial);
  const [secrets, setSecrets] = useState<SecretDrafts>(EMPTY_SECRETS);
  const [clear, setClear] = useState<ClearSecrets>(KEEP_SECRETS);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const updated = await apiRequest<ServiceConfigView>("/api/admin/service-settings", {
        method: "PATCH",
        body: JSON.stringify(requestBody(settings, secrets, clear)),
      });
      setSettings(updated);
      setSecrets(EMPTY_SECRETS);
      setClear(KEEP_SECRETS);
      setMessage("服务配置已加密保存并开始生效。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "服务配置未保存，请检查字段后重试。");
    } finally {
      setLoading(false);
    }
  }
  return {
    settings, secrets, clear, loading, message, error, save,
    changeStorage: (patch: Partial<ServiceConfigView["storage"]>) => setSettings((current) => ({ ...current, storage: { ...current.storage, ...patch } })),
    changeImageApi: (patch: Partial<ServiceConfigView["imageApi"]>) => setSettings((current) => ({ ...current, imageApi: { ...current.imageApi, ...patch } })),
    changeEmail: (patch: Partial<ServiceConfigView["email"]>) => setSettings((current) => ({ ...current, email: { ...current.email, ...patch } })),
    changeSecrets: (patch: Partial<SecretDrafts>) => setSecrets((current) => ({ ...current, ...patch })),
    changeClear: (patch: Partial<ClearSecrets>) => setClear((current) => ({ ...current, ...patch })),
  };
}

type ServiceSettingsState = ReturnType<typeof useServiceSettings>;

function ServiceSettingsCards({ form }: { form: ServiceSettingsState }) {
  return (
    <>
      <StorageSettingsCard
        value={form.settings.storage}
        secret={form.secrets.s3}
        clearSecret={form.clear.s3}
        onChange={form.changeStorage}
        onSecretChange={(s3) => form.changeSecrets({ s3 })}
        onClearSecret={(s3) => form.changeClear({ s3 })}
      />
      <ImageApiSettingsCard
        value={form.settings.imageApi}
        secret={form.secrets.imageApi}
        clearSecret={form.clear.imageApi}
        onChange={form.changeImageApi}
        onSecretChange={(imageApi) => form.changeSecrets({ imageApi })}
        onClearSecret={(imageApi) => form.changeClear({ imageApi })}
      />
      <EmailSettingsCard
        value={form.settings.email}
        secret={form.secrets.email}
        clearSecret={form.clear.email}
        onChange={form.changeEmail}
        onSecretChange={(email) => form.changeSecrets({ email })}
        onClearSecret={(email) => form.changeClear({ email })}
      />
    </>
  );
}
