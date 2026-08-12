export type AppUserRole = "admin" | "manager" | "staff" | "trainer";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: AppUserRole;
  status: "active" | "inactive";
  createdAt: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface AppUserWithPassword extends AppUser {
  password?: string;
}
