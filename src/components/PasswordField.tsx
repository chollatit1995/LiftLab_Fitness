"use client";

import { useState } from "react";
import { generateTempPassword } from "@/lib/temp-password";

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
}

export function PasswordField({
  value,
  onChange,
  label = "รหัสผ่านชั่วคราว / Temporary Password",
  hint,
}: PasswordFieldProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <label className="label-field">{label}</label>
      <div className="flex gap-2">
        <input
          className="input-field font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={() => onChange(generateTempPassword())}
          title="สุ่มรหัสผ่าน"
          className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-slate-500 transition hover:bg-slate-50 hover:text-brand-600"
        >
          <span className="material-symbols-outlined text-[20px]">casino</span>
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!value}
          title="คัดลอก"
          className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-slate-500 transition hover:bg-slate-50 hover:text-brand-600 disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[20px]">
            {copied ? "check" : "content_copy"}
          </span>
        </button>
      </div>
      <p className="mt-1.5 text-xs text-slate-400">
        {hint ??
          "อย่างน้อย 8 ตัวอักษร มีทั้งตัวอักษรและตัวเลข — กดปุ่มลูกเต๋าเพื่อสุ่มรหัสให้อัตโนมัติ"}
      </p>
    </div>
  );
}
