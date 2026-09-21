import CommerceApp from "@/components/commerce-app";

export const metadata = {
  title: "Product Details | Eona Empire",
  description: "View product details, available options, pricing, and stock.",
};

export default function ProductPage() {
  return <CommerceApp view="product" />;
}
