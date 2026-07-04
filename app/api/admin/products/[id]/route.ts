import { ProductStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ProductIdRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const mapStockToStatus = (stock?: string): ProductStatus => {
  const value = String(stock || "In Stock").trim().toLowerCase();

  if (value === "out of stock") return ProductStatus.OUT_OF_STOCK;
  if (value === "coming soon") return ProductStatus.COMING_SOON;
  if (value === "inactive") return ProductStatus.INACTIVE;

  return ProductStatus.ACTIVE;
};

const getOrCreateCategoryId = async (categoryName: string) => {
  const name = categoryName.trim() || "Daily Pooja Packs";
  const slug = createSlug(name) || "daily-pooja-packs";

  const category = await prisma.category.upsert({
    where: {
      slug,
    },
    update: {
      name,
      isActive: true,
    },
    create: {
      name,
      slug,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  return category.id;
};

const buildUpdateData = async (body: any): Promise<Prisma.ProductUpdateInput> => {
  const data: Prisma.ProductUpdateInput = {};

  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.slug !== undefined) data.slug = String(body.slug).trim();
  if (body.price !== undefined) data.price = toNumber(body.price);
  if (body.mrp !== undefined) data.mrp = toNumber(body.mrp);
  if (body.image !== undefined) {
    const image = String(body.image || "/premium-pooja-pack.jpg").trim();
    data.image = image;
    data.images = [image];
  }
  if (body.badge !== undefined) data.badge = String(body.badge).trim();
  if (body.delivery !== undefined) {
    data.deliveryNote = String(body.delivery || "Next Morning Delivery").trim();
  }
  if (body.stock !== undefined) data.stockStatus = mapStockToStatus(body.stock);
  if (body.stockQuantity !== undefined) {
    data.stockQuantity = toNumber(body.stockQuantity, 0);
  }
  if (body.description !== undefined) {
    data.description = String(body.description || "").trim();
  }
  if (body.material !== undefined || body.unit !== undefined) {
    data.unit = String(body.material || body.unit || "pack").trim();
  }
  if (body.isFeatured !== undefined) {
    data.isFeatured = Boolean(body.isFeatured);
  }
  if (body.category !== undefined) {
    const categoryId = await getOrCreateCategoryId(String(body.category || ""));
    data.category = {
      connect: {
        id: categoryId,
      },
    };
  }

  return data;
};

export async function PATCH(request: Request, { params }: ProductIdRouteProps) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await buildUpdateData(body);

    const product = await prisma.product.update({
      where: {
        id,
      },
      data,
      include: {
        category: true,
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (error) {
    console.error("Update product error:", error);

    return NextResponse.json(
      { ok: false, message: "Unable to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: ProductIdRouteProps) {
  try {
    const { id } = await params;

    await prisma.product.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete product error:", error);

    return NextResponse.json(
      { ok: false, message: "Unable to delete product" },
      { status: 500 }
    );
  }
}
