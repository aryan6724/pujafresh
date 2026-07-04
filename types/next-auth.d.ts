import { DefaultSession } from "next-auth";

type UserRole = "CUSTOMER" | "ADMIN" | "MANAGER" | "DELIVERY_PARTNER";

declare module "next-auth" {
  interface User {
    role: UserRole;
    fullName: string;
    phone?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      fullName: string;
      phone?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    fullName?: string;
    phone?: string | null;
  }
}