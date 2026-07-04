import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalizeSlug = (value: string) => {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const getStockLabel = (stockStatus: string, stockQuantity: number) => {
  if (stockStatus === "OUT_OF_STOCK" || stockQuantity <= 0) return "Out of Stock";
  if (stockStatus === "COMING_SOON") return "Coming Soon";
  if (stockStatus === "INACTIVE") return "Inactive";
  return "In Stock";
};

const formatProduct = (product: any) => {
  const image = product.image || "/premium-pooja-pack.jpg";
  const price = Number(product.price || 0);
  const mrp = product.mrp ? Number(product.mrp) : price;

  return {
    id: product.id,
    dbId: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    price,
    mrp,
    image,
    images:
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : [image],
    badge: product.badge || "Fresh",
    category: product.category?.name || "Pooja Essentials",
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

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const requestedSlug = normalizeSlug(decodeURIComponent(slug));

    const products = await prisma.product.findMany({
      where: {
        stockStatus: {
          not: "INACTIVE",
        },
      },
      include: {
        category: true,
      },
    });

    const product = products.find((item: any) => {
      return (
        normalizeSlug(item.slug) === requestedSlug ||
        normalizeSlug(item.name) === requestedSlug
      );
    });

    if (!product) {
      return NextResponse.json(
        {
          ok: false,
          message: "Product not found.",
          requestedSlug,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      product: formatProduct(product),
    });
  } catch (error) {
    console.error("Product details API error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to fetch product details.",
      },
      { status: 500 }
    );
  }
}
