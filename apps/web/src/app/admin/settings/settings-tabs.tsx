"use client";

import type { ServiceConfigView } from "@image-playground/core";
import { Coins, PlugZap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceSettingsForm } from "./service-settings-form";
import { AdminSettingsForm, type AdminSettings } from "./settings-form";

interface SettingsTabsProps {
  readonly business: AdminSettings;
  readonly services: ServiceConfigView;
}

export function SettingsTabs({ business, services }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="business" className="min-w-0">
      <TabsList className="grid w-full grid-cols-2 sm:w-96">
        <TabsTrigger value="business" className="gap-2"><Coins className="size-4" aria-hidden="true" />业务规则</TabsTrigger>
        <TabsTrigger value="services" className="gap-2"><PlugZap className="size-4" aria-hidden="true" />服务接入</TabsTrigger>
      </TabsList>
      <TabsContent value="business"><AdminSettingsForm initial={business} /></TabsContent>
      <TabsContent value="services"><ServiceSettingsForm initial={services} /></TabsContent>
    </Tabs>
  );
}
