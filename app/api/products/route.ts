import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const getStockLabel = (stockStatus: string, stockQuantity: number) => {
  if (stockStatus === "OUT_OF_STOCK" || stockQuantity <= 0) return "Out of Stock";
  if (stockStatus === "COMING_SOON") return "Coming Soon";
  if (stockStatus === "INACTIVE") return "Inactive";
  return "In Stock";
};

const formatProduct = (product: any) => {
  const image = product.image || "/premium-pooja-pack.jpg";

  return {
    id: product.id,
    dbId: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    price: Number(product.price),
    mrp: product.mrp ? Number(product.mrp) : Number(product.price),
    image,
    images:
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : [image],
    badge: product.badge || "Fresh",
    category: product.category?.name || "Uncategorized",
    categorySlug: product.category?.slug || "",
    rating: 4.8,
    reviews: 0,
    stock: getStockLabel(product.stockStatus, product.stockQuantity),
    stockStatus: product.stockStatus,
    stockQuantity: product.stockQuantity,
    delivery: product.deliveryNote || "Early morning delivery",
    material: product.unit || "pack",
    unit: product.unit || "pack",
    isFeatured: product.isFeatured,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const featured = searchParams.get("featured") === "true";
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = {};

    if (!includeInactive) {
      where.stockStatus = {
        not: "INACTIVE",
      };
    }

    if (featured) {
      where.isFeatured = true;
    }

    if (category && category !== "all") {
      where.category = {
        slug: category,
      };
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          badge: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          category: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [
        {
          isFeatured: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      count: products.length,
      products: products.map(formatProduct),
    });
  } catch (error) {
    console.error("Products API error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to fetch products.",
      },
      { status: 500 }
    );
  }
}
