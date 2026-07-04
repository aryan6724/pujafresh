import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const normalizeEmail = (email: unknown) => {
  return String(email || "").trim().toLowerCase();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const email = normalizeEmail(body.email);
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!fullName || !email || !password) {
      return NextResponse.json(
        {
          ok: false,
          message: "Full name, email and password are required.",
        },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        {
          ok: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          message: "Password must be at least 8 characters long.",
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          ok: false,
          message: "Password and confirm password do not match.",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          ok: false,
          message:
            existingUser.email === email
              ? "An account with this email already exists."
              : "An account with this phone number already exists.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone: phone || null,
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Account created successfully.",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Something went wrong while creating the account.",
      },
      { status: 500 }
    );
  }
}