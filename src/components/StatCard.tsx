interface StatCardProps {
  icon: string;
  labelTh: string;
  labelEn: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  accent?: "green" | "blue" | "purple" | "orange";
}

const accentMap = {
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
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
  const changeColor =
    changeType === "up"
      ? "text-emerald-600"
      : changeType === "down"
        ? "text-red-500"
        : "text-slate-500";

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${accentMap[accent]}`}
        >
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        {change && (
          <span className={`text-xs font-medium ${changeColor}`}>{change}</span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{labelTh}</p>
      <p className="text-xs text-slate-400">{labelEn}</p>
    </div>
  );
}
