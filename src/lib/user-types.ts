export type AppUserRole = "admin" | "manager" | "staff";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: AppUserRole;
  status: "active" | "inactive";
  createdAt: string;
}

export interface AppUserWithPassword extends AppUser {
  password?: string;
}
