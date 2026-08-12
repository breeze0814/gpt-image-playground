import type { Metadata } from "next";
import { ImagePlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GenerateForm } from "./generate-form";

export const metadata: Metadata = { title: "文生图" };

export default function GeneratePage() {
  return (
    <div className="grid gap-6 sm:gap-8">
      <PageHeader title="把文字变成图片" description="描述主体、场景、光线与风格。系统每次生成一张图片，提交前会显示本次积分成本。" icon={ImagePlus} />
      <GenerateForm />
    </div>
  );
}
