/** จำนวนแต้ม (แก้ว) ที่ต้องสะสมก่อนแลกฟรี 1 แก้ว */
export const STAMPS_PER_FREE = 10;

/** ราคาต่อแก้ว (บาท) สำหรับรายงานยอดขายเมื่อยืนยันสะสมแต้ม */
export const DEFAULT_COFFEE_CUP_PRICE = 45;

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

export type CoffeeRequestType = "stamp" | "redeem";
export type CoffeeRequestStatus = "pending" | "confirmed" | "rejected";

export interface CoffeeStampRequest {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  requestType: CoffeeRequestType;
  status: CoffeeRequestStatus;
  stampsSnapshot: number;
  staffName: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CoffeeMemberSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  loyalty: CoffeeLoyalty;
}

export interface CoffeeDailySale {
  date: string;
  cupsSold: number;
  freeCups: number;
  amount: number;
}

export interface CoffeeSalesReport {
  from: string;
  to: string;
  cupPrice: number;
  days: CoffeeDailySale[];
  totals: {
    cupsSold: number;
    freeCups: number;
    amount: number;
  };
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

export function requestTypeLabel(type: CoffeeRequestType): string {
  return type === "stamp" ? "ขอสะสมแต้ม" : "ขอแลกฟรี 1 แก้ว";
}

export function requestStatusLabel(status: CoffeeRequestStatus): string {
  if (status === "pending") return "รอพนักงานยืนยัน";
  if (status === "confirmed") return "ยืนยันแล้ว";
  return "ปฏิเสธแล้ว";
}
