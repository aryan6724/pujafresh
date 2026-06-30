import { products as defaultProducts } from "@/data/products";
import { Product } from "@/types";

export const PRODUCTS_STORAGE_KEY = "pujafresh-products";

export const productCategories = [
  "Daily Pooja Packs",
  "Fresh Flowers",
  "Pooja Samagri",
  "Festival Kits",
  "Murtis",
  "Subscriptions",
];

export const stockOptions = [
  "In Stock",
  "Limited Stock",
  "Out of Stock",
  "Coming Soon",
];

export function createSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createUniqueSlug(
  name: string,
  products: Product[],
  editingProductId?: number | null
) {
  const baseSlug = createSlug(name);
  let finalSlug = baseSlug;
  let count = 1;

  while (
    products.some(
      (product) =>
        product.slug === finalSlug && product.id !== editingProductId
    )
  ) {
    finalSlug = `${baseSlug}-${count}`;
    count += 1;
  }

  return finalSlug;
}

export function getProducts() {
  if (typeof window === "undefined") {
    return defaultProducts;
  }

  const savedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);

  if (!savedProducts) {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(defaultProducts));
    return defaultProducts;
  }

  try {
    const parsedProducts = JSON.parse(savedProducts) as Product[];

    if (Array.isArray(parsedProducts)) {
      return parsedProducts;
    }

    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(defaultProducts));
    return defaultProducts;
  } catch {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(defaultProducts));
    return defaultProducts;
  }
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
}

export function resetProductsToDefault() {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(defaultProducts));
  return defaultProducts;
}