import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

type UserRole = "CUSTOMER" | "ADMIN" | "MANAGER" | "DELIVERY_PARTNER";

type AuthUser = {
  id: string;
  name?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: UserRole;
};

const normalizeEmail = (email: unknown) => {
  return String(email || "").trim().toLowerCase();
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "Email and Password",

      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const password = String(credentials?.password || "");

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) return null;

        const isValidPassword = await verifyPassword(
          password,
          user.passwordHash
        );

        if (!isValidPassword) return null;

        return {
          id: user.id,
          name: user.fullName,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role as UserRole,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;

        token.id = authUser.id;
        token.role = authUser.role || "CUSTOMER";
        token.fullName = authUser.fullName || authUser.name || "";
        token.phone = authUser.phone || null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) || "CUSTOMER";
        session.user.fullName = token.fullName as string;
        session.user.phone = (token.phone as string | null) || null;
      }

      return session;
    },
  },
});
