/** จำนวนแต้ม (แก้ว) ที่ต้องสะสมก่อนแลกฟรี 1 แก้ว */
export const STAMPS_PER_FREE = 10;

export interface CoffeeLoyalty {
  memberId: string;
  stamps: number;
  totalStamps: number;
  freeRedeemed: number;
  updatedAt: string;
}

export interface CoffeeLoyaltyEvent {
  id: string;
  memberId: string;
  eventType: "stamp" | "redeem";
  stampsAfter: number;
  staffName: string | null;
  createdAt: string;
}

export interface CoffeeMemberSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  loyalty: CoffeeLoyalty;
}

export function stampsUntilFree(stamps: number): number {
  const mod = stamps % STAMPS_PER_FREE;
  return mod === 0 && stamps > 0 ? 0 : STAMPS_PER_FREE - mod;
}

export function canRedeemFree(stamps: number): boolean {
  return stamps >= STAMPS_PER_FREE;
}

export function displayStamps(stamps: number): number {
  if (stamps <= 0) return 0;
  const mod = stamps % STAMPS_PER_FREE;
  return mod === 0 ? STAMPS_PER_FREE : mod;
}

export function eventTypeLabel(type: CoffeeLoyaltyEvent["eventType"]): string {
  return type === "stamp" ? "สะสมแต้ม" : "แลกฟรี 1 แก้ว";
}
