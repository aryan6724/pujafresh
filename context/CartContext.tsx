"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { Product } from "@/types";

type CartItem = Product & {
  quantity: number;
  cartItemId?: string;
  dbId?: string;
  isDatabaseItem?: boolean;
};

type CartContextType = {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product) => void;
  removeFromCart: (id: number) => void;
  increaseQuantity: (id: number) => void;
  decreaseQuantity: (id: number) => void;
  clearCart: () => void;
};

type ApiCartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    dbId?: string;
    name: string;
    slug: string;
    description?: string;
    price: number;
    mrp?: number;
    image?: string;
    images?: string[];
    badge?: string;
    category?: string;
    categorySlug?: string;
    rating?: number;
    reviews?: number;
    stock?: string;
    stockStatus?: string;
    stockQuantity?: number;
    delivery?: string;
    material?: string;
    unit?: string;
  };
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_CART_KEY = "pujafresh-cart";

const isCustomKitProduct = (product: Product) => {
  return (
    product.category === "Custom Kit" ||
    product.badge === "Custom Kit" ||
    product.slug?.startsWith("custom-pooja-kit")
  );
};

const getAvailableStock = (product: Product) => {
  if (isCustomKitProduct(product)) return 999;

  return Number(
    product.stockQuantity ??
      (product.stock === "Out of Stock" || product.stock === "Coming Soon"
        ? 0
        : 999)
  );
};

const isUnavailableProduct = (product: Product) => {
  if (isCustomKitProduct(product)) return false;

  return (
    product.stock === "Out of Stock" ||
    product.stock === "Coming Soon" ||
    getAvailableStock(product) <= 0
  );
};

const getStableCartActionId = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000000000;
  }

  return hash || Date.now();
};

const convertApiCartItemToCartItem = (
  item: ApiCartItem,
  index: number
): CartItem => {
  const product = item.product;
  const image = product.image || "/premium-pooja-pack.jpg";

  return {
    id: getStableCartActionId(item.id || `${product.id}-${index}`),
    dbId: product.id,
    cartItemId: item.id,
    isDatabaseItem: true,
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    price: Number(product.price || 0),
    mrp: Number(product.mrp || product.price || 0),
    image,
    images:
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : [image],
    badge: product.badge || "Fresh",
    category: product.category || "Pooja Essentials",
    rating: Number(product.rating || 4.8),
    reviews: Number(product.reviews || 0),
    stock: product.stock || "In Stock",
    stockQuantity: Number(product.stockQuantity || 0),
    delivery: product.delivery || "Early morning delivery",
    material: product.material || product.unit || "pack",
    quantity: item.quantity,
  } as CartItem;
};

const readLocalCart = () => {
  if (typeof window === "undefined") return [];

  try {
    const savedCart = localStorage.getItem(LOCAL_CART_KEY);

    if (!savedCart) return [];

    const parsedCart = JSON.parse(savedCart) as CartItem[];

    if (!Array.isArray(parsedCart)) return [];

    return parsedCart.filter((item) => isCustomKitProduct(item));
  } catch {
    return [];
  }
};

const saveLocalCart = (items: CartItem[]) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();

  const [databaseItems, setDatabaseItems] = useState<CartItem[]>([]);
  const [localItems, setLocalItems] = useState<CartItem[]>([]);

  const cartItems = useMemo(() => {
    return [...databaseItems, ...localItems];
  }, [databaseItems, localItems]);

  useEffect(() => {
    setLocalItems(readLocalCart());
  }, []);

  useEffect(() => {
    saveLocalCart(localItems);
  }, [localItems]);

  const loadDatabaseCart = async () => {
    if (status !== "authenticated") {
      setDatabaseItems([]);
      return;
    }

    try {
      const response = await fetch("/api/cart", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setDatabaseItems([]);
        return;
      }

      const formattedItems = (data.items || []).map(
        (item: ApiCartItem, index: number) =>
          convertApiCartItemToCartItem(item, index)
      );

      setDatabaseItems(formattedItems);
    } catch (error) {
      console.error("Load cart error:", error);
      setDatabaseItems([]);
    }
  };

  useEffect(() => {
    loadDatabaseCart();
  }, [status]);

  const addLocalItemToCart = (product: Product) => {
    if (isUnavailableProduct(product)) {
      toast.error(`${product.name} is currently not available`);
      return;
    }

    const availableStock = getAvailableStock(product);

    setLocalItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);

      if (existingItem) {
        if (existingItem.quantity >= availableStock) {
          toast.error(`Only ${availableStock} unit(s) available`);
          return prevItems;
        }

        return prevItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...prevItems,
        {
          ...product,
          quantity: 1,
        },
      ];
    });

    toast.success(`${product.name} added to cart`);
  };

  const addDatabaseItemToCart = async (product: Product) => {
    if (status !== "authenticated") {
      toast.error("Please login to add items to cart");
      return;
    }

    if (isUnavailableProduct(product)) {
      toast.error(`${product.name} is currently not available`);
      return;
    }

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: product.slug,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        toast.error(data.message || "Unable to add item to cart");
        return;
      }

      toast.success(data.message || `${product.name} added to cart`);
      await loadDatabaseCart();
    } catch (error) {
      console.error("Add cart error:", error);
      toast.error("Unable to add item to cart");
    }
  };

  const addToCart = (product: Product) => {
    if (isCustomKitProduct(product)) {
      addLocalItemToCart(product);
      return;
    }

    void addDatabaseItemToCart(product);
  };

  const removeFromCart = (id: number) => {
    const databaseItem = databaseItems.find((item) => item.id === id);

    if (databaseItem?.cartItemId) {
      void (async () => {
        try {
          const response = await fetch(`/api/cart/${databaseItem.cartItemId}`, {
            method: "DELETE",
          });

          const data = await response.json();

          if (!response.ok || !data.ok) {
            toast.error(data.message || "Unable to remove item");
            return;
          }

          toast.success(data.message || "Item removed from cart");
          await loadDatabaseCart();
          toast.success("Cart cleared");
        } catch (error) {
          console.error("Remove cart error:", error);
          toast.error("Unable to remove item");
        }
      })();

      return;
    }

    setLocalItems((prevItems) => prevItems.filter((item) => item.id !== id));
    toast.success("Item removed from cart");
  };

  const increaseQuantity = (id: number) => {
    const databaseItem = databaseItems.find((item) => item.id === id);

    if (databaseItem?.cartItemId) {
      void (async () => {
        try {
          const response = await fetch(`/api/cart/${databaseItem.cartItemId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quantity: databaseItem.quantity + 1,
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.ok) {
            toast.error(data.message || "Unable to update cart");
            return;
          }

          await loadDatabaseCart();
        } catch (error) {
          console.error("Increase cart error:", error);
          toast.error("Unable to update cart");
        }
      })();

      return;
    }

    setLocalItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;

        const availableStock = getAvailableStock(item);

        if (item.quantity >= availableStock) {
          toast.error(`Only ${availableStock} unit(s) available`);
          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        };
      })
    );
  };

  const decreaseQuantity = (id: number) => {
    const databaseItem = databaseItems.find((item) => item.id === id);

    if (databaseItem?.cartItemId) {
      void (async () => {
        try {
          const response = await fetch(`/api/cart/${databaseItem.cartItemId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quantity: databaseItem.quantity - 1,
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.ok) {
            toast.error(data.message || "Unable to update cart");
            return;
          }

          await loadDatabaseCart();
        } catch (error) {
          console.error("Decrease cart error:", error);
          toast.error("Unable to update cart");
        }
      })();

      return;
    }

    setLocalItems((prevItems) =>
      prevItems
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setLocalItems([]);

    if (databaseItems.length === 0) {
      return;
    }

    void (async () => {
      try {
        for (const item of databaseItems) {
          if (!item.cartItemId) continue;

          await fetch(`/api/cart/${item.cartItemId}`, {
            method: "DELETE",
          });
        }

        await loadDatabaseCart();
      } catch (error) {
        console.error("Clear cart error:", error);
        toast.error("Unable to clear full cart");
      }
    })();
  };

  let cartCount = 0;
  let cartTotal = 0;

  for (const item of cartItems) {
    cartCount = cartCount + item.quantity;
    cartTotal = cartTotal + item.price * item.quantity;
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
