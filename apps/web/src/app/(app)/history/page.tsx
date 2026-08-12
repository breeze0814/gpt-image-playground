import type { Metadata } from "next";
import { History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HistoryList } from "./history-list";

export const metadata: Metadata = { title: "创作历史" };

export default function HistoryPage() {
  return <><PageHeader title="创作历史" description="从最近七天的任务中继续查看结果与创作指令。" icon={History} /><HistoryList /></>;
}
