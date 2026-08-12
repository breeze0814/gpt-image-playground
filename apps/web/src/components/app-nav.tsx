"use client";

import { Check, Coins, History, ImagePlus, LayoutDashboard, LogOut, Moon, SlidersHorizontal, Sun, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button, buttonVariants } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";

const NAV_ITEMS = [
  { href: "/generate", label: "生图", icon: ImagePlus },
  { href: "/edit", label: "修图", icon: SlidersHorizontal },
  { href: "/history", label: "历史", icon: History },
] as const;

const MOBILE_NAV_ITEMS = [
  ...NAV_ITEMS,
  { href: "/credits", label: "积分", icon: Coins },
] as const;

interface AppNavProps {
  user: { name: string; email: string; avatarUrl: string | null };
  isAdmin: boolean;
}

interface HeaderStatus {
  balance: number;
  checkedIn: boolean;
}

function useHeaderStatus() {
  const [status, setStatus] = useState<HeaderStatus | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void apiRequest<HeaderStatus>("/api/header-status")
      .then(setStatus)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  async function checkIn(): Promise<void> {
    setCheckingIn(true);
    setError("");
    try {
      const result = await apiRequest<{ reward: number }>("/api/check-in", { method: "POST" });
      setStatus((current) => ({ balance: (current?.balance ?? 0) + result.reward, checkedIn: true }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "签到失败，请稍后重试");
    } finally {
      setCheckingIn(false);
    }
  }

  return { status, checkingIn, error, checkIn };
}

type HeaderStatusController = ReturnType<typeof useHeaderStatus>;

function getCheckInLabel(controller: HeaderStatusController): string {
  if (controller.checkingIn) return "签到中";
  if (controller.status?.checkedIn) return "今日已签到";
  if (controller.error) return "重试签到";
  if (!controller.status) return "读取中";
  return "每日签到";
}

function isCheckInDisabled(controller: HeaderStatusController): boolean {
  const loadingStatus = controller.status === null && controller.error === "";
  return controller.checkingIn || loadingStatus || controller.status?.checkedIn === true;
}

function getCheckInState(controller: HeaderStatusController): string | undefined {
  if (controller.error) return "error";
  if (controller.status?.checkedIn) return "success";
  if (controller.checkingIn || !controller.status) return "loading";
  return undefined;
}

function UserAvatar({ user }: Pick<AppNavProps, "user">) {
  const fallback = user.name.trim().slice(0, 1).toUpperCase();
  return (
    <Avatar className="size-9">
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={`${user.name}的头像`} />}
      <AvatarFallback>
        {fallback || <User className="size-4" aria-hidden="true" />}
      </AvatarFallback>
    </Avatar>
  );
}

function BalanceBadge({ balance, className }: { balance: number | undefined; className: string }) {
  return (
    <Badge tone="primary" className={cn("truncate px-2", className)}>
      {balance?.toLocaleString("zh-CN") ?? "--"}
    </Badge>
  );
}

function CheckInIcon({ checkedIn }: { checkedIn: boolean }) {
  return checkedIn
    ? <Check className="size-4 text-success" aria-hidden="true" />
    : <Coins className="size-4 text-primary" aria-hidden="true" />;
}

interface AccountMenuProps extends AppNavProps {
  controller: HeaderStatusController;
}

function AccountStatusItems({ controller }: Pick<AccountMenuProps, "controller">) {
  return (
    <>
      <DropdownMenuItem asChild>
        <Link href="/credits">
          <Coins className="size-4" aria-hidden="true" />积分
          <BalanceBadge balance={controller.status?.balance} className="ml-auto max-w-24" />
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={isCheckInDisabled(controller)}
        onSelect={(event) => {
          event.preventDefault();
          void controller.checkIn();
        }}
      >
        <CheckInIcon checkedIn={controller.status?.checkedIn === true} />
        {getCheckInLabel(controller)}
      </DropdownMenuItem>
      {controller.error && <p role="alert" className="px-3 py-2 text-xs leading-5 text-destructive">{controller.error}</p>}
    </>
  );
}

function AccountUtilityItems({ dark, isAdmin, setTheme }: { dark: boolean; isAdmin: boolean; setTheme: (theme: string) => void }) {
  return (
    <>
      <DropdownMenuItem onSelect={() => setTheme(dark ? "light" : "dark")}>
        {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
        {dark ? "切换浅色主题" : "切换深色主题"}
      </DropdownMenuItem>
      {isAdmin && <DropdownMenuItem asChild><Link href="/admin"><LayoutDashboard className="size-4" aria-hidden="true" />管理控制台</Link></DropdownMenuItem>}
    </>
  );
}

function AccountMenu({ user, isAdmin, controller }: AccountMenuProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  async function signOut(): Promise<void> {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="打开账户菜单" title="账户菜单"><UserAvatar user={user} /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="mt-12 w-72 md:mt-0">
        <DropdownMenuLabel><span className="block truncate text-foreground">{user.name}</span><span className="mt-1 block truncate font-normal">{user.email}</span></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <AccountStatusItems controller={controller} />
        <DropdownMenuSeparator />
        <AccountUtilityItems dark={resolvedTheme === "dark"} isAdmin={isAdmin} setTheme={setTheme} />
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}><LogOut className="size-4" aria-hidden="true" />退出登录</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopPrimaryNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="主导航" className="hidden h-full items-stretch justify-center md:flex">
      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 items-center px-4 text-sm font-semibold text-muted-foreground transition-colors after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-foreground after:opacity-0 after:content-[''] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:opacity-80",
              active && "text-foreground after:opacity-100",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobilePrimaryNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="移动端主导航" className="safe-page-x grid h-12 grid-cols-4 border-t border-border md:hidden">
      {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-w-0 items-center justify-center gap-1 px-1 text-xs font-semibold leading-none text-muted-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-foreground after:opacity-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:opacity-80",
              active && "text-foreground after:opacity-100",
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function HeaderActions({ controller }: { controller: HeaderStatusController }) {
  const checkedIn = controller.status?.checkedIn === true;
  return (
    <div className="hidden items-center gap-1 md:flex">
      <Button
        variant="outline"
        className="w-28 px-2"
        onClick={() => void controller.checkIn()}
        disabled={isCheckInDisabled(controller)}
        title={controller.error || undefined}
        data-state={getCheckInState(controller)}
      >
        <CheckInIcon checkedIn={checkedIn} />
        {getCheckInLabel(controller)}
      </Button>
      <Link href="/credits" className={cn(buttonVariants({ variant: "ghost" }), "w-24 justify-between px-2")}>
        <span>积分</span>
        <BalanceBadge balance={controller.status?.balance} className="max-w-12" />
      </Link>
    </div>
  );
}

export function AppNav(props: AppNavProps) {
  const controller = useHeaderStatus();
  return (
    <header className="workspace-nav sticky top-0 z-[var(--z-sticky-nav)] border-b border-border bg-background">
      <div className="workspace-nav__inner safe-page-x mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between md:grid md:h-16 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center">
          <Logo className="md:hidden" />
          <Logo className="hidden md:inline-flex" />
          <Separator orientation="vertical" className="mx-3 hidden h-6 md:block" />
          <span className="hidden truncate text-sm font-medium text-muted-foreground lg:block">创作台</span>
        </div>
        <DesktopPrimaryNav />
        <div className="flex min-w-0 items-center justify-end gap-1">
          <HeaderActions controller={controller} />
          <AccountMenu {...props} controller={controller} />
        </div>
      </div>
      <div className="workspace-nav__mobile-tabs"><MobilePrimaryNav /></div>
    </header>
  );
}
