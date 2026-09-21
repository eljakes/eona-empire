import CommerceApp from "@/components/commerce-app";
import { fallbackCategories } from "@/lib/store-data";

export const metadata = {
  title: "Collections | Eona Empire",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...fallbackCategories.map((category) => ({ slug: category.slug })),
    { slug: "glueless-wigs" },
  ];
}

export default async function CollectionPage({ params }) {
  const { slug } = await params;

  return <CommerceApp view="collection" collectionSlug={slug} />;
}
