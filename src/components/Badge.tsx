interface BadgeProps {
  label: string;
  className?: string;
}

export function Badge({ label, className = "bg-slate-100 text-slate-600" }: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
