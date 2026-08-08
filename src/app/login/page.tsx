"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        rel="stylesheet"
      />

      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white" />
          <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-white" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <span className="material-symbols-outlined text-[28px] text-white">
                fitness_center
              </span>
            </div>
            <div>
              <p className="text-xl font-bold text-white">LiftLab Fitness</p>
              <p className="text-sm text-white/70">ระบบบริหารจัดการฟิตเนส</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-white">
            จัดการฟิตเนส
            <br />
            ได้อย่างมืออาชีพ
          </h1>
          <p className="max-w-md text-lg text-white/80">
            Dashboard การจอง จัดการพนักงาน และแพ็กเกจสมาชิก — ครบในระบบเดียว
          </p>

          <div className="space-y-3">
            {[
              "Dashboard สรุปคลาส สมาชิก และยอดขาย",
              "ระบบจองคลาส เทรนเนอร์ และพื้นที่",
              "จัดการพนักงานและแพ็กเกจสมาชิก",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-white/90">
                  check_circle
                </span>
                <span className="text-sm text-white/90">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/50">
          © 2026 LiftLab Fitness — ระบบจัดการฟิตเนสครบวงจร
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-slate-50 px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <span className="material-symbols-outlined text-[24px]">
                fitness_center
              </span>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">LiftLab Fitness</p>
              <p className="text-xs text-slate-500">ระบบบริหารจัดการฟิตเนส</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">เข้าสู่ระบบ</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to LiftLab Fitness Management
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span className="material-symbols-outlined text-[18px]">
                  error
                </span>
                {error}
              </div>
            )}

            <div>
              <label className="label-field">อีเมล / Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                  mail
                </span>
                <input
                  type="email"
                  className="input-field pl-10"
                  placeholder="admin@liftlab.fitness"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label-field">รหัสผ่าน / Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
                  lock
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">
                    login
                  </span>
                  เข้าสู่ระบบ
                </>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold text-slate-500">
              บัญชีทดลองใช้งาน / Demo accounts
            </p>
            <div className="space-y-1.5 text-xs text-slate-600">
              <p>
                <span className="font-medium">Admin:</span> admin@liftlab.fitness
              </p>
              <p>
                <span className="font-medium">Manager:</span>{" "}
                manager@liftlab.fitness
              </p>
              <p>
                <span className="font-medium">Password:</span> LiftLab@2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
