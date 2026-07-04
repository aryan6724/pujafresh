import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

export async function GET() {
  try {
    const categories: CategoryItem[] = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedCategories = categories.map((category: CategoryItem) => {
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image || "",
        productCount: 0,
      };
    });

    return NextResponse.json({
      ok: true,
      count: formattedCategories.length,
      categories: formattedCategories,
    });
  } catch (error) {
    console.error("Categories API error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to fetch categories.",
      },
      { status: 500 }
    );
  }
}