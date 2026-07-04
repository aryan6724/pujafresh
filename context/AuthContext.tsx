"use client";

import { createContext, ReactNode, useContext } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type UserRole = "CUSTOMER" | "ADMIN" | "MANAGER" | "DELIVERY_PARTNER";

type User = {
  id?: string;
  fullName: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  password?: string;
  role?: UserRole;
};

type AuthResult = {
  success: boolean;
  message: string;
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  register: (userData: User) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const sessionUser = session?.user as
    | {
        id?: string;
        name?: string | null;
        fullName?: string | null;
        email?: string | null;
        phone?: string | null;
        role?: UserRole;
      }
    | undefined;

  const user: User | null = sessionUser
    ? {
        id: sessionUser.id,
        fullName:
          sessionUser.fullName ||
          sessionUser.name ||
          sessionUser.email?.split("@")[0] ||
          "User",
        name: sessionUser.name,
        email: sessionUser.email || "",
        phone: sessionUser.phone || "",
        role: sessionUser.role || "CUSTOMER",
      }
    : null;

  const register = async (userData: User): Promise<AuthResult> => {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone || "",
        password: userData.password || "",
        confirmPassword: userData.password || "",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Unable to create account",
      };
    }

    return {
      success: true,
      message: data.message || "Account created successfully",
    };
  };

  const login = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error || result.ok === false) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    return {
      success: true,
      message: "Login successful",
    };
  };

  const logout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: Boolean(user),
        isLoading: status === "loading",
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}