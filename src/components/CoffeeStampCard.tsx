import {
  STAMPS_PER_FREE,
  displayStamps,
  stampsUntilFree,
} from "@/lib/coffee-loyalty";

interface CoffeeStampCardProps {
  stamps: number;
  memberName?: string;
  compact?: boolean;
  showLegend?: boolean;
}

export function CoffeeStampCard({
  stamps,
  memberName,
  compact = false,
  showLegend = true,
}: CoffeeStampCardProps) {
  const filled = displayStamps(stamps);
  const untilFree = stampsUntilFree(stamps);
  const completed = stamps >= STAMPS_PER_FREE && untilFree === 0;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/80 shadow-lg shadow-amber-900/10 ${
        compact ? "p-4" : "p-6 sm:p-8"
      }`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-orange-200/30 blur-2xl" />

      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800/70">
              Liftlab Coffee
            </p>
            <h3
              className={`font-bold text-amber-950 ${
                compact ? "text-lg" : "text-2xl"
              }`}
            >
              สะสมครบ {STAMPS_PER_FREE} แก้ว ฟรี 1 แก้ว
            </h3>
            {memberName && (
              <p className="mt-1 text-sm text-amber-900/70">{memberName}</p>
            )}
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-700 to-orange-600 text-white shadow-md">
            <span className="material-symbols-outlined text-[26px]">coffee</span>
          </div>
        </div>

        <div
          className={`grid grid-cols-5 gap-2 sm:gap-3 ${
            compact ? "mb-3" : "mb-5"
          }`}
        >
          {Array.from({ length: STAMPS_PER_FREE }, (_, i) => {
            const active = i < filled;
            return (
              <div
                key={i}
                className={`flex aspect-square items-center justify-center rounded-2xl border-2 transition ${
                  active
                    ? "border-amber-600 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md"
                    : "border-dashed border-amber-300/80 bg-white/70 text-amber-300"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    compact ? "text-[18px]" : "text-[22px]"
                  }`}
                >
                  {active ? "check" : "coffee"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-amber-950">
            {completed ? (
              <span className="text-emerald-700">พร้อมแลกฟรี 1 แก้ว!</span>
            ) : (
              <>
                สะสมแล้ว{" "}
                <span className="text-lg text-amber-800">{filled}</span> /{" "}
                {STAMPS_PER_FREE} แก้ว
              </>
            )}
          </p>
          {showLegend && !completed && (
            <p className="text-xs text-amber-800/70">
              อีก {untilFree} แก้ว ได้ฟรี 1 แก้ว
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
