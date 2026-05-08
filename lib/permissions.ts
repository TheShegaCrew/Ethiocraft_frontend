import type { UserRole } from "@/lib/auth-context";

export type AppFeature =
  | "admin.dashboard"
  | "agent.dashboard"
  | "artisan.dashboard"
  | "customer.dashboard";

const DASHBOARD_PATH_BY_ROLE: Record<Exclude<UserRole, null>, string> = {
  ADMIN: "/admin/dashboard",
  VERIFICATION_AGENT: "/agent/dashboard",
  ARTISAN: "/artisan/dashboard",
  CUSTOMER: "/customer/dashboard",
};

const ALLOWED_FEATURES_BY_ROLE: Record<Exclude<UserRole, null>, AppFeature[]> = {
  ADMIN: ["admin.dashboard"],
  VERIFICATION_AGENT: ["agent.dashboard"],
  ARTISAN: ["artisan.dashboard"],
  CUSTOMER: ["customer.dashboard"],
};

export function dashboardForRole(role: string | null | undefined): string {
  const normalizedRole = String(role ?? "").toUpperCase() as Exclude<UserRole, null>;
  return DASHBOARD_PATH_BY_ROLE[normalizedRole] ?? DASHBOARD_PATH_BY_ROLE.CUSTOMER;
}

export function canAccess(role: UserRole, feature: AppFeature): boolean {
  if (!role) return false;
  return ALLOWED_FEATURES_BY_ROLE[role]?.includes(feature) ?? false;
}
