import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
}

export function PageHeader({ title, description, icon: Icon, action }: PageHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="workspace-header__identity">
        <span className="workspace-header__icon"><Icon aria-hidden="true" className="size-5" /></span>
        <div className="min-w-0">
          <h1 className="workspace-header__title">{title}</h1>
          <p className="workspace-header__description">{description}</p>
        </div>
      </div>
      {action}
    </header>
  );
}
