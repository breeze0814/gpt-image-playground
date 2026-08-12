"use client";

import { CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EMAIL_OTP_EXPIRY_MINUTES, EMAIL_OTP_LENGTH } from "@/lib/auth-constraints";
import { getAuthErrorMessage } from "@/lib/auth-error";
import { authClient } from "@/lib/auth-client";

type RecoveryStep = "request" | "reset" | "complete";

function useRecoveryState() {
  const [step, setStep] = useState<RecoveryStep>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function returnToRequest(): void {
    setStep("request");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
  }

  return { step, email, otp, password, confirmPassword, loading, error, notice, setStep, setEmail, setOtp, setPassword, setConfirmPassword, setLoading, setError, setNotice, returnToRequest };
}

type RecoveryState = ReturnType<typeof useRecoveryState>;

function useRecoveryActions(state: RecoveryState) {
  async function requestCode(): Promise<void> {
    state.setLoading(true);
    state.setError("");
    state.setNotice("");
    try {
      const result = await authClient.emailOtp.requestPasswordReset({ email: state.email.trim() });
      if (result.error) {
        state.setError(getAuthErrorMessage(result.error, "验证码发送失败，请稍后重试。"));
        return;
      }
      state.setStep("reset");
      state.setNotice("如果该邮箱已注册，验证码已发送，请检查收件箱。");
    } catch (reason) {
      state.setError(reason instanceof Error ? reason.message : "验证码发送失败，请稍后重试。");
    } finally {
      state.setLoading(false);
    }
  }

  async function resetPassword(): Promise<void> {
    state.setNotice("");
    if (state.password !== state.confirmPassword) {
      state.setError("两次输入的密码不一致，请重新确认。");
      return;
    }
    state.setLoading(true);
    state.setError("");
    try {
      const result = await authClient.emailOtp.resetPassword({ email: state.email.trim(), otp: state.otp, password: state.password });
      if (result.error) {
        state.setError(getAuthErrorMessage(result.error, "验证码无效或已过期，请重新获取。"));
        return;
      }
      state.setOtp("");
      state.setPassword("");
      state.setConfirmPassword("");
      state.setStep("complete");
    } catch (reason) {
      state.setError(reason instanceof Error ? reason.message : "密码重置失败，请稍后重试。");
    } finally {
      state.setLoading(false);
    }
  }

  return { requestCode, resetPassword };
}

function RecoveryMessages({ error, notice }: Pick<RecoveryState, "error" | "notice">) {
  return (
    <div aria-live="polite" className="grid gap-3">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {notice && <Alert variant="success"><AlertDescription>{notice}</AlertDescription></Alert>}
    </div>
  );
}

function RequestCodeForm({ state, onSubmit }: { state: RecoveryState; onSubmit: () => void }) {
  return (
    <form method="post" onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="grid gap-5">
      <RecoveryMessages error={state.error} notice={state.notice} />
      <FormField htmlFor="recovery-email" label="注册邮箱" description="我们会向已注册邮箱发送验证码。" required>
        <div className="relative">
          <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <Input id="recovery-email" name="email" type="email" autoComplete="email" required disabled={state.loading} value={state.email} onChange={(event) => state.setEmail(event.target.value)} className="pl-10" aria-describedby="recovery-email-message" />
        </div>
      </FormField>
      <Button type="submit" className="w-full" disabled={state.loading} data-state={state.loading ? "loading" : undefined}>
        {state.loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}发送重置验证码
      </Button>
      <Link href="/login" className={buttonVariants({ variant: "ghost" })}>返回登录</Link>
    </form>
  );
}

function ResetPasswordForm({ state, onSubmit, onResend }: { state: RecoveryState; onSubmit: () => void; onResend: () => void }) {
  return (
    <form method="post" onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="grid gap-5">
      <RecoveryMessages error={state.error} notice={state.notice} />
      <FormField htmlFor="recovery-otp" label="邮箱验证码" description={`${EMAIL_OTP_LENGTH} 位验证码，${EMAIL_OTP_EXPIRY_MINUTES} 分钟内有效。`} required>
        <Input id="recovery-otp" name="otp" inputMode="numeric" autoComplete="one-time-code" required minLength={EMAIL_OTP_LENGTH} maxLength={EMAIL_OTP_LENGTH} disabled={state.loading} value={state.otp} onChange={(event) => state.setOtp(event.target.value.replace(/\D/g, ""))} className="text-center text-xl tabular-nums" aria-describedby="recovery-otp-message" />
      </FormField>
      <PasswordField id="new-password" label="新密码" value={state.password} autoComplete="new-password" onChange={state.setPassword} disabled={state.loading} />
      <PasswordField id="confirm-new-password" label="确认新密码" value={state.confirmPassword} autoComplete="new-password" onChange={state.setConfirmPassword} disabled={state.loading} />
      <Button type="submit" className="w-full" disabled={state.loading || state.otp.length !== EMAIL_OTP_LENGTH} data-state={state.loading ? "loading" : undefined}>
        {state.loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}更新密码
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" onClick={onResend} disabled={state.loading}>重新发送</Button>
        <Button type="button" variant="ghost" onClick={state.returnToRequest} disabled={state.loading}>更换邮箱</Button>
      </div>
    </form>
  );
}

function RecoveryComplete({ email }: { email: string }) {
  return (
    <div className="grid gap-5">
      <Alert variant="success"><CheckCircle2 aria-hidden="true" className="size-4" /><AlertDescription>密码已更新，旧登录会话已经失效。</AlertDescription></Alert>
      <Link href={`/login?email=${encodeURIComponent(email)}`} className={buttonVariants()}>使用新密码登录</Link>
    </div>
  );
}

export function ForgotPasswordForm() {
  const state = useRecoveryState();
  const actions = useRecoveryActions(state);
  const title = state.step === "request" ? "找回密码" : state.step === "reset" ? "设置新密码" : "重置完成";
  const description = state.step === "request" ? "输入注册邮箱以接收验证码。" : state.step === "reset" ? `验证码已发送至 ${state.email.trim()}。` : "现在可以使用新密码登录。";
  return (
    <Card>
      <CardHeader><CardTitle className="text-2xl">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent>
        {state.step === "request" && <RequestCodeForm state={state} onSubmit={() => void actions.requestCode()} />}
        {state.step === "reset" && <ResetPasswordForm state={state} onSubmit={() => void actions.resetPassword()} onResend={() => void actions.requestCode()} />}
        {state.step === "complete" && <RecoveryComplete email={state.email.trim()} />}
      </CardContent>
    </Card>
  );
}
