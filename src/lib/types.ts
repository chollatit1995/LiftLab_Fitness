export type StaffRole = "admin" | "trainer" | "front_desk" | "manager";

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: "active" | "inactive";
  joinedAt: string;
}

export interface FitnessClass {
  id: string;
  name: string;
  description: string;
  trainerId: string;
  capacity: number;
  duration: number;
  schedule: string;
  price: number;
  status: "active" | "inactive";
}

export interface MembershipPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  features: string[];
  status: "active" | "inactive";
  popular?: boolean;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  packageId: string;
  joinedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "pending";
}

export type BookingType = "class" | "trainer" | "facility";

export interface Booking {
  id: string;
  type: BookingType;
  memberId: string;
  resourceId: string;
  resourceName: string;
  date: string;
  time: string;
  status: "confirmed" | "cancelled" | "completed";
  notes?: string;
}

export interface Facility {
  id: string;
  name: string;
  type: string;
  capacity: number;
  status: "available" | "maintenance";
}

export interface Sale {
  id: string;
  memberId: string;
  memberName: string;
  item: string;
  amount: number;
  date: string;
  type: "membership" | "class" | "pt" | "other";
}

export interface AppData {
  staff: Staff[];
  classes: FitnessClass[];
  packages: MembershipPackage[];
  members: Member[];
  bookings: Booking[];
  facilities: Facility[];
  sales: Sale[];
}
