"use client";

import { LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMAIL_OTP_EXPIRY_MINUTES, EMAIL_OTP_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-constraints";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up";
type Step = "credentials" | "verification";

const INLINE_FIELD_CLASS = "auth-inline-field";

function displayNameFromEmail(email: string): string {
  const [localPart] = email.split("@");
  if (!localPart) throw new Error("请输入有效的邮箱地址。");
  return localPart;
}

interface CredentialsFieldsProps { readonly mode: Mode; readonly email: string; readonly password: string; readonly confirmPassword: string; readonly setEmail: (value: string) => void; readonly setPassword: (value: string) => void; readonly setConfirmPassword: (value: string) => void }

interface AccountFieldProps {
  readonly email: string;
  readonly onChange: (value: string) => void;
}

function AccountField({ email, onChange }: AccountFieldProps) {
  return (
    <div className={INLINE_FIELD_CLASS}>
      <label className="auth-inline-field__label" htmlFor="email">
        账号<span aria-hidden="true" className="text-destructive">*</span>
      </label>
      <div className="auth-inline-field__control">
        <div className="relative">
          <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => onChange(event.target.value)} className="pl-10" />
        </div>
      </div>
    </div>
  );
}

function CredentialsFields({ mode, email, password, confirmPassword, setEmail, setPassword, setConfirmPassword }: CredentialsFieldsProps) {
  return (
    <div className="auth-credentials">
      <AccountField email={email} onChange={setEmail} />
      <PasswordField id="password" label="密码" value={password} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} onChange={setPassword} fieldClassName={INLINE_FIELD_CLASS} />
      {mode === "sign-up" ? (
        <PasswordField id="confirm-password" label="确认密码" value={confirmPassword} autoComplete="new-password" onChange={setConfirmPassword} fieldClassName={INLINE_FIELD_CLASS} />
      ) : (
        <Link href="/forgot-password" className={cn(buttonVariants({ variant: "link" }), "auth-forgot-password")}>
          忘记密码？
        </Link>
      )}
    </div>
  );
}

interface VerificationFieldsProps { readonly email: string; readonly otp: string; readonly loading: boolean; readonly onChange: (value: string) => void; readonly onResend: () => void; readonly onBack: () => void }

function VerificationFields({ email, otp, loading, onChange, onResend, onBack }: VerificationFieldsProps) {
  const verificationLabel = loading ? "正在验证邮箱…" : "验证邮箱并继续";
  return (
    <div className="auth-verification">
      <FormField htmlFor="otp" label="邮箱验证码" description={`验证码已发送至 ${email}，${EMAIL_OTP_EXPIRY_MINUTES} 分钟内有效。`} required className={INLINE_FIELD_CLASS}>
        <Input id="otp" inputMode="numeric" autoComplete="one-time-code" required minLength={EMAIL_OTP_LENGTH} maxLength={EMAIL_OTP_LENGTH} value={otp} onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))} className="text-center text-xl tabular-nums" />
      </FormField>
      <Button type="submit" className="auth-submit" disabled={loading || otp.length !== EMAIL_OTP_LENGTH} data-state={loading ? "loading" : undefined}>
        {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {verificationLabel}
      </Button>
      <div className="auth-verification__actions">
        <Button type="button" variant="outline" onClick={onResend} disabled={loading}>重新发送</Button>
        <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>返回修改</Button>
      </div>
    </div>
  );
}

function useAuthState(initialError: string, initialEmail: string) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  function switchMode(nextMode: Mode): void { setMode(nextMode); setStep("credentials"); setOtp(""); setError(""); }
  return { mode, step, email, password, confirmPassword, otp, loading, error, setStep, setEmail, setPassword, setConfirmPassword, setOtp, setLoading, setError, switchMode };
}

type AuthState = ReturnType<typeof useAuthState>;

function useAuthActions(state: AuthState) {
  const router = useRouter();
  function openWorkspace(): void { router.push("/generate"); router.refresh(); }
  async function submitCredentials(): Promise<void> {
    if (state.mode === "sign-up" && state.password !== state.confirmPassword) { state.setError("两次输入的密码不一致，请重新输入确认密码。"); return; }
    state.setLoading(true); state.setError("");
    try {
      const email = state.email.trim();
      const result = state.mode === "sign-up" ? await authClient.signUp.email({ name: displayNameFromEmail(email), email, password: state.password }) : await authClient.signIn.email({ email, password: state.password });
      if (result.error) { if (state.mode === "sign-in" && result.error.code === "EMAIL_NOT_VERIFIED") { state.setStep("verification"); return; } state.setError(getAuthErrorMessage(result.error, state.mode === "sign-up" ? "注册失败，请检查信息后重试。" : "邮箱或密码不匹配，请检查后重试。")); return; }
      if (state.mode === "sign-up") state.setStep("verification"); else openWorkspace();
    } catch (reason) { state.setError(reason instanceof Error ? reason.message : "认证请求失败，请稍后重试。"); } finally { state.setLoading(false); }
  }
  async function verifyEmail(): Promise<void> {
    state.setLoading(true); state.setError("");
    try { const result = await authClient.emailOtp.verifyEmail({ email: state.email.trim(), otp: state.otp }); if (result.error) state.setError(getAuthErrorMessage(result.error, "验证码无效或已过期，请重新获取。")); else openWorkspace(); }
    catch (reason) { state.setError(reason instanceof Error ? reason.message : "验证码校验失败，请稍后重试。"); } finally { state.setLoading(false); }
  }
  async function resendVerification(): Promise<void> {
    state.setLoading(true); state.setError("");
    try { const result = await authClient.emailOtp.sendVerificationOtp({ email: state.email.trim(), type: "email-verification" }); if (result.error) state.setError(getAuthErrorMessage(result.error, "验证码发送失败，请稍后重试。")); }
    catch (reason) { state.setError(reason instanceof Error ? reason.message : "验证码发送失败，请稍后重试。"); } finally { state.setLoading(false); }
  }
  return { submitCredentials, verifyEmail, resendVerification };
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const state = useAuthState(searchParams.get("error") === "disabled" ? "账户已被禁用，请联系管理员。" : "", searchParams.get("email") ?? "");
  const actions = useAuthActions(state);
  function submit(event: React.FormEvent<HTMLFormElement>): void { event.preventDefault(); void (state.step === "credentials" ? actions.submitCredentials() : actions.verifyEmail()); }
  const title = state.step === "verification" ? "验证邮箱" : state.mode === "sign-up" ? "创建创作账号" : "欢迎回来";
  const description = state.step === "verification" ? "完成邮箱验证后即可进入工作台。" : state.mode === "sign-up" ? `使用邮箱注册，密码至少 ${PASSWORD_MIN_LENGTH} 位。` : "使用注册邮箱和密码登录。";
  const actionLabel = state.loading ? "正在验证身份…" : state.mode === "sign-up" ? "注册并发送验证码" : "登录并开始创作";
  return (
    <section className="auth-form" aria-labelledby="auth-form-title">
      <Tabs value={state.mode} onValueChange={(value) => state.switchMode(value as Mode)}>
        <TabsList className="auth-tabs">
          <TabsTrigger value="sign-in">登录</TabsTrigger>
          <TabsTrigger value="sign-up">注册</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="auth-form__heading">
        <p>{state.step === "verification" ? "02 / 邮箱确认" : state.mode === "sign-up" ? "01 / 创建账户" : "01 / 返回工作台"}</p>
        <h1 id="auth-form-title">{title}</h1>
        <span>{description}</span>
      </div>
      <form method="post" onSubmit={submit} className="auth-form__body">
        <div aria-live="polite">
          {state.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
        </div>
        {state.step === "credentials" ? (
          <>
            <CredentialsFields mode={state.mode} email={state.email} password={state.password} confirmPassword={state.confirmPassword} setEmail={state.setEmail} setPassword={state.setPassword} setConfirmPassword={state.setConfirmPassword} />
            <Button type="submit" className="auth-submit" disabled={state.loading} data-state={state.loading ? "loading" : undefined}>
              {state.loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {actionLabel}
            </Button>
          </>
        ) : (
          <VerificationFields email={state.email} otp={state.otp} loading={state.loading} onChange={state.setOtp} onResend={() => void actions.resendVerification()} onBack={() => { state.setStep("credentials"); state.setOtp(""); state.setError(""); }} />
        )}
      </form>
    </section>
  );
}
