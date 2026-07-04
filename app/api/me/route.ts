import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      {
        ok: false,
        message: "Not authenticated",
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    user: session.user,
  });
}
