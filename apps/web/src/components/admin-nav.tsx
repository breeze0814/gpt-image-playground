"use client";

import { ArrowLeft, Coins, LayoutDashboard, ListChecks, Menu, TicketCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { Badge } from "./ui/badge";
import { Button, buttonVariants } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/tasks", label: "任务管理", icon: ListChecks },
  { href: "/admin/codes", label: "兑换码", icon: TicketCheck },
  { href: "/admin/settings", label: "积分配置", icon: Coins },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

function AdminLinks() {
  const pathname = usePathname();
  return ADMIN_NAV.map(({ href, label, icon: Icon }) => (
    <Link key={href} href={href} aria-current={isCurrent(pathname, href) ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-[color,background-color,opacity] duration-200 ease-out hover:bg-muted hover:text-foreground active:opacity-80 focus-visible:ring-2 focus-visible:ring-ring", isCurrent(pathname, href) && "bg-accent text-accent-foreground")}><Icon className="size-5" />{label}</Link>
  ));
}

function MobileAdminNav() {
  return (
    <header className="safe-page-x sticky top-0 z-[var(--z-sticky-nav)] flex h-14 items-center justify-between border-b border-border bg-background lg:hidden">
      <Logo compact />
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline"><Menu className="size-4" />管理菜单</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel>运营控制台</DropdownMenuLabel><DropdownMenuSeparator />{ADMIN_NAV.map(({ href, label, icon: Icon }) => <DropdownMenuItem key={href} asChild><Link href={href}><Icon className="size-4" />{label}</Link></DropdownMenuItem>)}<DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/generate"><ArrowLeft className="size-4" />返回创作台</Link></DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export function AdminNav() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-[var(--z-sticky-nav)] hidden w-64 flex-col border-r border-border bg-card px-4 py-5 lg:flex"><div className="flex items-center justify-between px-2"><Logo compact /><Badge tone="primary">ADMIN</Badge></div><nav aria-label="管理导航" className="mt-8 grid gap-1"><AdminLinks /></nav><Link href="/generate" className={cn(buttonVariants({ variant: "ghost" }), "mt-auto justify-start")}><ArrowLeft className="size-4" />返回创作台</Link></aside>
      <MobileAdminNav />
    </>
  );
}
