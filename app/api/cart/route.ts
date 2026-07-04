import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type FormattedCartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    dbId: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    mrp: number;
    image: string;
    images: string[];
    badge: string;
    category: string;
    categorySlug: string;
    rating: number;
    reviews: number;
    stock: string;
    stockStatus: string;
    stockQuantity: number;
    delivery: string;
    material: string;
    unit: string;
  };
  lineTotal: number;
  createdAt: Date;
  updatedAt: Date;
};

const getSessionUserId = (session: any) => {
  return String(session?.user?.id || "").trim();
};

const getStockLabel = (stockStatus: string, stockQuantity: number) => {
  if (stockStatus === "OUT_OF_STOCK" || stockQuantity <= 0) {
    return "Out of Stock";
  }

  if (stockStatus === "COMING_SOON") {
    return "Coming Soon";
  }

  if (stockStatus === "INACTIVE") {
    return "Inactive";
  }

  return "In Stock";
};

const formatCartItem = (item: any): FormattedCartItem => {
  const product = item.product;
  const price = Number(product.price || 0);
  const mrp = product.mrp ? Number(product.mrp) : price;
  const image = product.image || "/premium-pooja-pack.jpg";

  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    product: {
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
    },
    lineTotal: price * item.quantity,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export async function GET() {
  try {
    const session = await auth();
    const userId = getSessionUserId(session);

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Please login to view cart.",
        },
        { status: 401 }
      );
    }

    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const formattedItems = cartItems.map((item: any) => formatCartItem(item));

    let subtotal = 0;

    for (const item of formattedItems) {
      subtotal = subtotal + item.lineTotal;
    }

    return NextResponse.json({
      ok: true,
      count: formattedItems.length,
      subtotal,
      items: formattedItems,
    });
  } catch (error) {
    console.error("Cart GET error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to fetch cart.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = getSessionUserId(session);

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Please login to add items to cart.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const productId = String(body.productId || "").trim();
    const slug = String(body.slug || "").trim();
    const quantity = Math.max(Number(body.quantity || 1), 1);

    if (!productId && !slug) {
      return NextResponse.json(
        {
          ok: false,
          message: "Product id or slug is required.",
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.findFirst({
      where: productId
        ? {
            id: productId,
          }
        : {
            slug,
          },
      select: {
        id: true,
        name: true,
        stockStatus: true,
        stockQuantity: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          ok: false,
          message: "Product not found.",
        },
        { status: 404 }
      );
    }

    if (product.stockStatus !== "ACTIVE" || product.stockQuantity <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "This product is currently not available.",
        },
        { status: 400 }
      );
    }

    const existingCartItem = await prisma.cartItem.findFirst({
      where: {
        userId,
        productId: product.id,
      },
    });

    const newQuantity = existingCartItem
      ? existingCartItem.quantity + quantity
      : quantity;

    if (newQuantity > product.stockQuantity) {
      return NextResponse.json(
        {
          ok: false,
          message: `Only ${product.stockQuantity} units available.`,
        },
        { status: 400 }
      );
    }

    let cartItem;

    if (existingCartItem) {
      cartItem = await prisma.cartItem.update({
        where: {
          id: existingCartItem.id,
        },
        data: {
          quantity: newQuantity,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          userId,
          productId: product.id,
          quantity,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: `${product.name} added to cart.`,
      item: formatCartItem(cartItem),
    });
  } catch (error) {
    console.error("Cart POST error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to add item to cart.",
      },
      { status: 500 }
    );
  }
}
