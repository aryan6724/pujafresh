"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

type User = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  register: (userData: User) => { success: boolean; message: string };
  login: (email: string, password: string) => { success: boolean; message: string };
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("pujafresh-current-user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const register = (userData: User) => {
    const savedUsers = JSON.parse(
      localStorage.getItem("pujafresh-users") || "[]"
    ) as User[];

    const alreadyExists = savedUsers.some(
      (savedUser) => savedUser.email === userData.email
    );

    if (alreadyExists) {
      return {
        success: false,
        message: "Email already registered",
      };
    }

    const updatedUsers = [...savedUsers, userData];

    localStorage.setItem("pujafresh-users", JSON.stringify(updatedUsers));
    localStorage.setItem("pujafresh-current-user", JSON.stringify(userData));

    setUser(userData);

    return {
      success: true,
      message: "Account created successfully",
    };
  };

  const login = (email: string, password: string) => {
    const savedUsers = JSON.parse(
      localStorage.getItem("pujafresh-users") || "[]"
    ) as User[];

    const matchedUser = savedUsers.find(
      (savedUser) => savedUser.email === email && savedUser.password === password
    );

    if (!matchedUser) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    localStorage.setItem("pujafresh-current-user", JSON.stringify(matchedUser));
    setUser(matchedUser);

    return {
      success: true,
      message: "Login successful",
    };
  };

  const logout = () => {
    localStorage.removeItem("pujafresh-current-user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: Boolean(user),
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