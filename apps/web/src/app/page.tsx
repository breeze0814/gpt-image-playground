import { ArrowRight, Check, ImagePlus, SlidersHorizontal, TimerReset } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CanvasPreview() {
  return (
    <figure aria-label="低饱和静物图像的生成结果示例" className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground"><span>生成预览</span><span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-success" />示例画布</span></div>
      <div className="grid gap-4 p-3 sm:p-4">
        <div aria-hidden="true" className="relative aspect-video overflow-hidden rounded-md bg-muted">
          <div className="absolute inset-[9%_12%_11%_10%] rounded-[28%_12%_18%_10%] bg-foreground/10" />
          <div className="absolute right-[12%] top-[13%] h-[28%] w-[24%] rounded-[50%_12%_40%_18%] bg-primary/90" />
          <div className="absolute bottom-[14%] left-[19%] h-[34%] w-[54%] -rotate-6 rounded-[20%_50%_15%_45%] bg-foreground/85" />
          <div className="absolute bottom-[20%] right-[22%] h-[13%] w-[19%] rotate-12 rounded-[12%_45%_18%_45%] bg-background" />
          <div className="absolute left-[16%] top-[17%] h-[9%] w-[30%] -rotate-12 rounded-sm bg-background/80" />
          <div className="absolute bottom-[11%] right-[10%] size-[17%] rounded-full border-[10px] border-background/80" />
        </div>
        <div className="hidden gap-3 border-t border-border pt-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div><p className="text-xs font-semibold text-muted-foreground">当前提示词</p><p className="mt-1 text-sm leading-6">低饱和珊瑚色静物，柔和侧光，留出呼吸感。</p></div><span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><Check aria-hidden="true" className="size-3.5" />已完成</span></div>
      </div>
    </figure>
  );
}

const WORKFLOW = [
  { number: "01", title: "写下画面", description: "用自然语言描述主体、构图、材质和光线。", icon: ImagePlus },
  { number: "02", title: "选择方向", description: "切换比例和质量，成本在提交前清楚可见。", icon: SlidersHorizontal },
  { number: "03", title: "继续修整", description: "使用主图与参考图，把结果带到下一轮。", icon: TimerReset },
] as const;

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-dvh">
      <header className="page-container flex items-center justify-between py-4 sm:py-5"><Logo compact className="sm:hidden" /><Logo className="hidden sm:inline-flex" /><Link href="/login" className={buttonVariants({ variant: "outline" })}>进入工作台</Link></header>
      <section className="page-container grid gap-6 pb-12 pt-6 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] md:items-center md:gap-10 md:pb-20 md:pt-12 lg:gap-16">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">文生图 · 多图修图</p>
          <h1 className="mt-5 max-w-[10ch] text-balance font-display text-4xl font-bold leading-[1.03] sm:text-5xl lg:text-[clamp(3.75rem,6vw,5.5rem)]">Image Playground</h1>
          <p className="mt-6 max-w-[54ch] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">从文字生成到多图修图，在一个安静、可追踪的工作台里完成创作。任务异步执行，积分冻结与退回都有记录。</p>
          <div className="mt-8 flex items-center gap-3"><Link href="/login" className={buttonVariants({ size: "lg" })}>开始创作<ArrowRight className="size-5" /></Link><span className="min-w-0 max-w-[16ch] text-xs leading-5 text-muted-foreground sm:max-w-none sm:text-sm">失败时自动退回冻结积分</span></div>
        </div>
        <CanvasPreview />
      </section>
      <section className="border-y border-border bg-card/60">
        <div className="page-container grid gap-0 py-4 sm:grid-cols-3">
          {WORKFLOW.map(({ number, title, description, icon: Icon }, index) => <article key={number} className={cn("grid gap-3 py-5 sm:px-6 sm:py-7", index !== 0 && "border-t border-border sm:border-l sm:border-t-0")}><div className="flex items-center gap-3"><span className="font-display text-sm font-bold text-primary">{number}</span><Icon className="size-4 text-muted-foreground" aria-hidden="true" /></div><h2 className="text-xl font-bold">{title}</h2><p className="max-w-[30ch] text-sm leading-6 text-muted-foreground">{description}</p></article>)}
        </div>
      </section>
      <footer className="page-container flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span className="font-display font-bold text-foreground">Image Playground</span><div className="flex min-w-0 items-center gap-5"><Link href="/login" className="whitespace-nowrap hover:text-foreground active:opacity-80">登录</Link><span>文生图 · 多图修图 · 任务记录</span></div></footer>
    </main>
  );
}
