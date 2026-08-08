interface PageHeaderProps {
  titleTh: string;
  titleEn: string;
  descriptionTh?: string;
  descriptionEn?: string;
  action?: React.ReactNode;
}

export function PageHeader({
  titleTh,
  titleEn,
  descriptionTh,
  descriptionEn,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {titleTh}
        </h1>
        <p className="mt-1 text-sm font-medium text-brand-600">{titleEn}</p>
        {(descriptionTh || descriptionEn) && (
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {descriptionTh}
            {descriptionEn && (
              <span className="block text-xs text-slate-400">
                {descriptionEn}
              </span>
            )}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
