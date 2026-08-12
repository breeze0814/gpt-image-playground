import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EditForm } from "./edit-form";

export const metadata: Metadata = { title: "多图修图" };

export default function EditPage() {
  return (
    <div className="grid gap-6 sm:gap-8">
      <PageHeader title="主图与多图参考修图" description="第一张是需要修改的主图，可再添加最多三张风格、人物或商品参考图。上传完成后才会创建任务。" icon={SlidersHorizontal} />
      <EditForm />
    </div>
  );
}
