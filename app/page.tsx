import HomeClient from "@/components/HomeClient";
import { products } from "@/data/products";

export default function Home() {
  return <HomeClient products={products} />;
}
