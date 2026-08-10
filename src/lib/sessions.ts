/** ตั้ง quota ครั้งเทรนจากแพ็กเกจ — null = ไม่จำกัดครั้ง (แบบรายเดือน/รายปี) */
export function sessionsFromPackage(
  sessionLimit?: number | null
): { sessionsTotal: number | null; sessionsUsed: number } {
  if (sessionLimit != null && sessionLimit > 0) {
    return { sessionsTotal: sessionLimit, sessionsUsed: 0 };
  }
  return { sessionsTotal: null, sessionsUsed: 0 };
}

export function hasSessionQuota(sessionsTotal?: number | null): boolean {
  return sessionsTotal != null && sessionsTotal > 0;
}

export function sessionsRemaining(
  sessionsTotal: number | null | undefined,
  sessionsUsed: number
): number | null {
  if (!hasSessionQuota(sessionsTotal)) return null;
  return Math.max(0, (sessionsTotal as number) - sessionsUsed);
}
