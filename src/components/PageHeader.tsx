interface PageHeaderProps {
  titleTh: string;
  titleEn: string;
  descriptionTh?: string;
  descriptionEn?: string;
  action?: React.ReactNode;
  icon?: string;
}

export function PageHeader({
  titleTh,
  titleEn,
  descriptionTh,
  descriptionEn,
  action,
  icon,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        {icon && (
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-emerald-500 text-white shadow-lg shadow-brand-600/25 sm:flex">
            <span className="material-symbols-outlined text-[26px]">{icon}</span>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            {titleEn}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {titleTh}
          </h1>
          {(descriptionTh || descriptionEn) && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {descriptionTh}
              {descriptionEn && (
                <span className="mt-0.5 block text-xs text-slate-400">
                  {descriptionEn}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
