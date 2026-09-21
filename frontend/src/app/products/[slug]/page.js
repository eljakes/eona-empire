import CommerceApp from "@/components/commerce-app";
import { fallbackProducts } from "@/lib/store-data";

export const metadata = {
  title: "Product Details | Eona Empire",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return fallbackProducts.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }) {
  const { slug } = await params;

  return <CommerceApp view="product" productSlug={slug} />;
}
