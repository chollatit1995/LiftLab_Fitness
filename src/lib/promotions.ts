import { MembershipPackage, Promotion, PromotionDiscountType } from "./types";

export const discountTypeLabels: Record<PromotionDiscountType, string> = {
  percent: "ลดเป็นเปอร์เซ็นต์",
  amount: "ลดเป็นจำนวนเงิน",
  gift: "ของแถม / สิทธิพิเศษ",
};

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** โปรที่ลูกค้าใช้ได้จริงตอนนี้ — เปิดใช้งานอยู่และอยู่ในช่วงวันที่กำหนด */
export function isLive(promo: Promotion, today: string = todayISO()): boolean {
  return (
    promo.status === "active" &&
    promo.startDate <= today &&
    today <= promo.endDate
  );
}

export function livePromotions(
  promotions: Promotion[],
  today: string = todayISO()
): Promotion[] {
  return promotions
    .filter((p) => isLive(p, today))
    .sort(
      (a, b) =>
        Number(b.highlight) - Number(a.highlight) ||
        a.endDate.localeCompare(b.endDate)
    );
}

/** โปรที่ผูกกับแพ็กเกจนี้ รวมโปรที่ไม่ได้ผูกแพ็กเกจ (ใช้ได้กับทุกแพ็กเกจ) */
export function promotionsForPackage(
  packageId: string,
  promotions: Promotion[],
  today: string = todayISO()
): Promotion[] {
  return livePromotions(promotions, today).filter(
    (p) => p.packageId === null || p.packageId === packageId
  );
}

export function applyDiscount(
  price: number,
  type: PromotionDiscountType,
  value: number
): number {
  if (type === "percent") {
    return Math.max(0, Math.round(price * (1 - value / 100)));
  }
  if (type === "amount") {
    return Math.max(0, price - value);
  }
  return price;
}

export interface BestOffer {
  promo: Promotion;
  price: number;
  saved: number;
}

/** โปรที่ทำให้แพ็กเกจนี้ถูกที่สุด — ของแถมไม่นับเพราะไม่ได้ลดราคา */
export function bestOfferFor(
  pkg: MembershipPackage,
  promotions: Promotion[],
  today: string = todayISO()
): BestOffer | null {
  let best: BestOffer | null = null;

  for (const promo of promotionsForPackage(pkg.id, promotions, today)) {
    if (promo.discountType === "gift") continue;

    const price = applyDiscount(
      pkg.price,
      promo.discountType,
      promo.discountValue
    );
    if (price >= pkg.price) continue;

    if (!best || price < best.price) {
      best = { promo, price, saved: pkg.price - price };
    }
  }

  return best;
}

export function discountBadge(promo: Promotion): string {
  if (promo.discountType === "percent") return `-${promo.discountValue}%`;
  if (promo.discountType === "amount")
    return `-${promo.discountValue.toLocaleString("th-TH")}฿`;
  return "ของแถม";
}

export function daysLeft(promo: Promotion, today: string = todayISO()): number {
  const end = new Date(promo.endDate + "T00:00:00").getTime();
  const now = new Date(today + "T00:00:00").getTime();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}
