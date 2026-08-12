import type { Metadata } from "next";
import { ArrowLeft, Check, KeyRound } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "找回密码" };

const RECOVERY_STEPS = ["验证注册邮箱", "设置新的登录密码", "返回登录页面"] as const;

export default function ForgotPasswordPage() {
  return (
    <main id="main-content" className="flex min-h-dvh flex-col">
      <header className="page-container flex items-center justify-between py-5">
        <Logo compact className="sm:hidden" />
        <Logo className="hidden sm:inline-flex" />
        <Link href="/login" className={buttonVariants({ variant: "ghost" })}><ArrowLeft aria-hidden="true" className="size-4" />返回登录</Link>
      </header>
      <section className="page-container grid flex-1 gap-12 pb-10 pt-3 sm:pt-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(420px,0.9fr)] lg:items-center lg:gap-24 lg:pb-24 lg:pt-16">
        <div className="hidden max-w-xl lg:block">
          <p className="text-sm font-semibold text-primary">账户恢复</p>
          <h1 className="mt-5 max-w-[12ch] font-display text-5xl font-bold leading-[1.03] sm:text-6xl">重新进入你的创作空间。</h1>
          <p className="mt-6 max-w-[48ch] text-lg leading-8 text-muted-foreground">通过注册邮箱完成身份验证，再设置一个新的登录密码。</p>
          <ol className="mt-8 grid gap-3 text-sm text-muted-foreground">
            {RECOVERY_STEPS.map((step) => <li key={step} className="flex items-center gap-3"><Check aria-hidden="true" className="size-4 text-success" />{step}</li>)}
          </ol>
          <p className="mt-12 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground"><KeyRound aria-hidden="true" className="size-4" />验证码不会改变当前密码，完成验证后才会更新</p>
        </div>
        <div className="min-w-0 lg:max-w-lg lg:justify-self-end">
          <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground sm:mb-4"><span>账户恢复</span><span>无需登录</span></div>
          <ForgotPasswordForm />
        </div>
      </section>
      <footer className="page-container flex items-center justify-between gap-4 border-t border-border py-5 text-xs text-muted-foreground sm:py-6"><span>Image Playground</span><span>邮箱验证码 · 密码重置</span></footer>
    </main>
  );
}
