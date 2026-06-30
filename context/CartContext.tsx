"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Product } from "@/types";
import { getProducts } from "@/utils/productStorage";

type CartItem = Product & {
  quantity: number;
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

const CartContext = createContext<CartContextType | undefined>(undefined);

const getAvailableStock = (product: Product) => {
  return Number(
    product.stockQuantity ??
      (product.stock === "Out of Stock" || product.stock === "Coming Soon"
        ? 0
        : 999)
  );
};

const isUnavailableProduct = (product: Product) => {
  return (
    product.stock === "Out of Stock" ||
    product.stock === "Coming Soon" ||
    getAvailableStock(product) <= 0
  );
};

const getLatestProduct = (product: Product) => {
  const latestProducts = getProducts();

  return (
    latestProducts.find(
      (latestProduct) =>
        latestProduct.id === product.id || latestProduct.slug === product.slug
    ) || product
  );
};

const syncCartWithLatestProducts = (savedCartItems: CartItem[]) => {
  const latestProducts = getProducts();

  return savedCartItems
    .map((cartItem) => {
      const latestProduct =
        latestProducts.find(
          (product) =>
            product.id === cartItem.id || product.slug === cartItem.slug
        ) || cartItem;

      const availableStock = getAvailableStock(latestProduct);

      if (isUnavailableProduct(latestProduct) || availableStock <= 0) {
        return null;
      }

      return {
        ...cartItem,
        ...latestProduct,
        quantity: Math.min(cartItem.quantity, availableStock),
      };
    })
    .filter((item): item is CartItem => item !== null);
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("pujafresh-cart");

    if (!savedCart) {
      return;
    }

    try {
      const parsedCart = JSON.parse(savedCart) as CartItem[];

      if (!Array.isArray(parsedCart)) {
        setCartItems([]);
        localStorage.removeItem("pujafresh-cart");
        return;
      }

      const syncedCart = syncCartWithLatestProducts(parsedCart);

      setCartItems(syncedCart);
      localStorage.setItem("pujafresh-cart", JSON.stringify(syncedCart));
    } catch {
      setCartItems([]);
      localStorage.removeItem("pujafresh-cart");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pujafresh-cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: Product) => {
    const latestProduct = getLatestProduct(product);

    if (isUnavailableProduct(latestProduct)) {
      toast.error(`${latestProduct.name} is currently not available`);
      return;
    }

    const availableStock = getAvailableStock(latestProduct);

    setCartItems((prevItems) => {
      const syncedItems = syncCartWithLatestProducts(prevItems);
      const existingItem = syncedItems.find(
        (item) => item.id === latestProduct.id
      );

      if (existingItem) {
        if (existingItem.quantity >= availableStock) {
          toast.error(
            `Only ${availableStock} unit(s) available for ${latestProduct.name}`
          );
          return syncedItems;
        }

        return syncedItems.map((item) =>
          item.id === latestProduct.id
            ? { ...item, ...latestProduct, quantity: item.quantity + 1 }
            : item
        );
      }

      if (availableStock < 1) {
        toast.error(`${latestProduct.name} is out of stock`);
        return syncedItems;
      }

      return [...syncedItems, { ...latestProduct, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const increaseQuantity = (id: number) => {
    setCartItems((prevItems) => {
      const syncedItems = syncCartWithLatestProducts(prevItems);

      return syncedItems.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const latestProduct = getLatestProduct(item);
        const availableStock = getAvailableStock(latestProduct);

        if (isUnavailableProduct(latestProduct)) {
          toast.error(`${latestProduct.name} is currently not available`);
          return item;
        }

        if (item.quantity >= availableStock) {
          toast.error(
            `Only ${availableStock} unit(s) available for ${latestProduct.name}`
          );
          return { ...item, ...latestProduct };
        }

        return { ...item, ...latestProduct, quantity: item.quantity + 1 };
      });
    });
  };

  const decreaseQuantity = (id: number) => {
    setCartItems((prevItems) =>
      prevItems
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

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
