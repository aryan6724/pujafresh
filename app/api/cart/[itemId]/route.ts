import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type CartItemRouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

const getSessionUserId = (session: any) => {
  return String(session?.user?.id || "").trim();
};

export async function PATCH(
  request: Request,
  context: CartItemRouteContext
) {
  try {
    const session = await auth();
    const userId = getSessionUserId(session);

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Please login to update cart.",
        },
        { status: 401 }
      );
    }

    const { itemId } = await context.params;
    const body = await request.json();
    const quantity = Number(body.quantity || 0);

    if (!itemId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cart item id is required.",
        },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      await prisma.cartItem.deleteMany({
        where: {
          id: itemId,
          userId,
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Item removed from cart.",
      });
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
      include: {
        product: true,
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cart item not found.",
        },
        { status: 404 }
      );
    }

    if (cartItem.product.stockStatus !== "ACTIVE" || cartItem.product.stockQuantity <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "This product is currently not available.",
        },
        { status: 400 }
      );
    }

    if (quantity > cartItem.product.stockQuantity) {
      return NextResponse.json(
        {
          ok: false,
          message: `Only ${cartItem.product.stockQuantity} units available.`,
        },
        { status: 400 }
      );
    }

    const updatedItem = await prisma.cartItem.update({
      where: {
        id: itemId,
      },
      data: {
        quantity,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Cart updated.",
      item: updatedItem,
    });
  } catch (error) {
    console.error("Cart PATCH error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to update cart.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: CartItemRouteContext
) {
  try {
    const session = await auth();
    const userId = getSessionUserId(session);

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Please login to remove cart item.",
        },
        { status: 401 }
      );
    }

    const { itemId } = await context.params;

    if (!itemId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Cart item id is required.",
        },
        { status: 400 }
      );
    }

    await prisma.cartItem.deleteMany({
      where: {
        id: itemId,
        userId,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Item removed from cart.",
    });
  } catch (error) {
    console.error("Cart DELETE error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to remove item from cart.",
      },
      { status: 500 }
    );
  }
}
