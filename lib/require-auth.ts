import { redirect } from "next/navigation";
import { auth } from "@/auth";

type UserRole = "CUSTOMER" | "ADMIN" | "MANAGER" | "DELIVERY_PARTNER";

export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (allowedRoles?.length && !allowedRoles.includes(session.user.role as UserRole)) {
    redirect("/");
  }

  return session;
}