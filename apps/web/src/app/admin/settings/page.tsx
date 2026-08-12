import { getServiceConfigView, listPricing, SETTING_KEYS } from "@image-playground/core";
import { prisma } from "@image-playground/db";
import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "./settings-tabs";

const BUSINESS_SETTING_KEYS = Object.freeze(Object.values(SETTING_KEYS));

function numericValue(settings: Array<{ key: string; value: unknown }>, key: string): number {
  const value = settings.find((setting) => setting.key === key)?.value;
  return typeof value === "number" ? value : 0;
}

export default async function AdminSettingsPage() {
  const [settings, pricing, services] = await Promise.all([
    prisma.appSetting.findMany({ where: { key: { in: [...BUSINESS_SETTING_KEYS] } } }),
    listPricing(),
    getServiceConfigView(),
  ]);
  const business = {
    welcomeCredits: numericValue(settings, SETTING_KEYS.welcomeCredits),
    checkInMin: numericValue(settings, SETTING_KEYS.checkInMin),
    checkInMax: numericValue(settings, SETTING_KEYS.checkInMax),
    pricing,
  };
  return (
    <div className="grid gap-6 sm:gap-8">
      <PageHeader
        title="系统配置"
        description="集中管理积分规则、文件存储、图像生成接口与邮件服务。服务密钥会加密保存，不会返回到浏览器。"
        icon={Settings2}
      />
      <SettingsTabs business={business} services={services} />
    </div>
  );
}
