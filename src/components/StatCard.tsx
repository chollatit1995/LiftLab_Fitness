interface StatCardProps {
  icon: string;
  labelTh: string;
  labelEn: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  accent?: "green" | "blue" | "purple" | "orange";
}

const accentStyles = {
  green: {
    icon: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-100",
    change: "bg-emerald-50 text-emerald-700",
  },
  blue: {
    icon: "from-sky-500 to-blue-600",
    ring: "ring-sky-100",
    change: "bg-sky-50 text-sky-700",
  },
  purple: {
    icon: "from-violet-500 to-purple-600",
    ring: "ring-violet-100",
    change: "bg-violet-50 text-violet-700",
  },
  orange: {
    icon: "from-orange-500 to-amber-500",
    ring: "ring-orange-100",
    change: "bg-orange-50 text-orange-700",
  },
};

export function StatCard({
  icon,
  labelTh,
  labelEn,
  value,
  change,
  changeType = "neutral",
  accent = "green",
}: StatCardProps) {
  const styles = accentStyles[accent];
  const changeColor =
    changeType === "up"
      ? "text-emerald-600"
      : changeType === "down"
        ? "text-red-500"
        : "text-slate-500";

  return (
    <div className="group card-hover relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-slate-100 to-transparent opacity-60 transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${styles.icon} text-white shadow-lg ring-4 ${styles.ring}`}
        >
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
        {change && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${changeType === "up" ? styles.change : changeColor}`}
          >
            {change}
          </span>
        )}
      </div>

      <p className="relative mt-5 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="relative mt-1 text-sm font-semibold text-slate-700">{labelTh}</p>
      <p className="relative text-xs text-slate-400">{labelEn}</p>
    </div>
  );
}
