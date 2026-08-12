import type { Metadata } from "next";
import { Coins } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CreditsPanel } from "./credits-panel";

export const metadata: Metadata = { title: "积分中心" };

export default function CreditsPage() {
  return <><PageHeader title="积分" description="查看余额、完成每日签到，或使用兑换码补充创作预算。" icon={Coins} /><CreditsPanel /></>;
}
