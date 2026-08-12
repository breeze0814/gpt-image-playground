import type { Metadata } from "next";
import { ArrowUpRight, Check, LockKeyhole, Sparkles } from "lucide-react";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "登录" };

const NOTES = ["异步任务，离开页面也不会丢失", "失败自动退回冻结积分", "七天内可回看任务结果"];

const WORKFLOW_STEPS = [
  { number: "01", label: "描述", detail: "把想法写下来" },
  { number: "02", label: "生成", detail: "等待任务完成", active: true },
  { number: "03", label: "回看", detail: "保留创作轨迹" },
];

function AuthenticationHeader() {
  return (
    <header className="auth-page__header page-container">
      <Logo />
      <p className="auth-page__header-note">
        <LockKeyhole aria-hidden="true" className="size-4" />
        使用邮箱安全进入
      </p>
    </header>
  );
}

function AuthenticationIntroduction() {
  return (
    <article className="auth-intro" aria-labelledby="auth-intro-title">
      <p className="auth-intro__index">Image Playground / 创作工作流</p>
      <div>
        <p className="auth-intro__eyebrow">
          <Sparkles aria-hidden="true" className="size-4" />
          你的图像工作台
        </p>
        <h2 id="auth-intro-title" className="auth-intro__title">
          把每一次图像探索，<span>留在手边。</span>
        </h2>
        <p className="auth-intro__lede">从一个描述开始，在同一个工作台中完成生成、修改与回看。</p>
      </div>

      <div className="auth-workflow" aria-label="创作工作流">
        {WORKFLOW_STEPS.map((step) => (
          <div key={step.number} className={step.active ? "auth-workflow__step auth-workflow__step--active" : "auth-workflow__step"}>
            <span className="auth-workflow__number">{step.number}</span>
            <strong>{step.label}</strong>
            <span>{step.detail}</span>
          </div>
        ))}
      </div>

      <ul className="auth-intro__notes">
        {NOTES.map((note) => (
          <li key={note}>
            <Check aria-hidden="true" className="size-4" />
            {note}
          </li>
        ))}
      </ul>
    </article>
  );
}

function AuthenticationAccess() {
  return (
    <div className="auth-access">
      <div className="auth-access__label">
        <span>账户访问</span>
        <span>01</span>
      </div>
      <Suspense fallback={<div className="auth-form-skeleton" aria-label="正在加载登录表单" />}>
        <LoginForm />
      </Suspense>
      <p className="auth-access__footnote">
        <LockKeyhole aria-hidden="true" className="size-4" />
        新账号需完成邮箱验证后进入工作台。
      </p>
      <a className="auth-access__home-link" href="/">
        返回首页
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </a>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main id="main-content" className="auth-page">
      <AuthenticationHeader />
      <section className="auth-page__main page-container">
        <AuthenticationIntroduction />
        <AuthenticationAccess />
      </section>
    </main>
  );
}
