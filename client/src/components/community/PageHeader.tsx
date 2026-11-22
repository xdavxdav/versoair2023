import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pb-5 border-b border-[#E6DFD6] dark:border-slate-800">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A202C] dark:text-slate-100">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
