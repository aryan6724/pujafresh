"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Product } from "@/types";

type WishlistContextType = {
  wishlistItems: Product[];
  wishlistCount: number;
  isInWishlist: (id: number) => boolean;
  toggleWishlist: (product: Product) => void;
  removeFromWishlist: (id: number) => void;
};

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);

  useEffect(() => {
    const savedWishlist = localStorage.getItem("pujafresh-wishlist");

    if (savedWishlist) {
      setWishlistItems(JSON.parse(savedWishlist));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "pujafresh-wishlist",
      JSON.stringify(wishlistItems)
    );
  }, [wishlistItems]);

  const isInWishlist = (id: number) => {
    return wishlistItems.some((item) => item.id === id);
  };

  const toggleWishlist = (product: Product) => {
    setWishlistItems((prevItems) => {
      const alreadyExists = prevItems.some((item) => item.id === product.id);

      if (alreadyExists) {
        return prevItems.filter((item) => item.id !== product.id);
      }

      return [...prevItems, product];
    });
  };

  const removeFromWishlist = (id: number) => {
    setWishlistItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const wishlistCount = wishlistItems.length;

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }

  return context;
}