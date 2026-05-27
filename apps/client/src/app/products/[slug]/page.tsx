import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { ProductDetailClient, type ProductWithMeta } from "./_client";
import { getAllImages, resolveProductImages, type Material, type ProductColorVariant } from "@udo-craft/shared";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data: prods } = await supabase.from("products").select("*, discount_grid, category_id, size_chart_id, marketing_meta").eq("is_active", true);
  const prodList = (prods ?? []) as ProductWithMeta[];
  const prod = prodList.find((p) => p.slug === slug || p.id === slug);

  if (!prod) {
    return { title: "Товар не знайдено | U:DO Craft" };
  }

  const imgs = resolveProductImages((prod as any).product_images, prod.images as Record<string, string>);
  const imageMap = getAllImages(imgs);
  const imageUrl = imageMap.front || Object.values(imageMap)[0] || "";

  return {
    title: `${prod.name} | Брендування та пошив | U:DO Craft`,
    description: prod.description || `Замовте корпоративний одяг ${prod.name} з індивідуальним принтом або вишивкою від 10 одиниць.`,
    openGraph: {
      title: `${prod.name} | Корпоративний одяг U:DO Craft`,
      description: prod.description || `Замовте корпоративний одяг ${prod.name} з індивідуальним принтом або вишивкою від 10 одиниць.`,
      images: [imageUrl],
      type: "website",
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const [{ data: prods }, { data: vars }, { data: mats }] = await Promise.all([
    supabase.from("products").select("*, discount_grid, category_id, size_chart_id, marketing_meta").eq("is_active", true),
    supabase.from("product_color_variants").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("materials").select("*").eq("is_active", true),
  ]);

  const prodList = (prods ?? []) as ProductWithMeta[];
  const prod = prodList.find((p) => p.slug === slug || p.id === slug);

  if (!prod) {
    notFound();
  }

  const prodVariants = ((vars ?? []) as ProductColorVariant[]).filter((v) => v.product_id === prod.id);
  const allVariants = (vars ?? []) as ProductColorVariant[];
  const materialsList = (mats ?? []) as Material[];

  const imgs = resolveProductImages((prod as any).product_images, prod.images as Record<string, string>);
  const imageMap = getAllImages(imgs);
  const imageUrl = imageMap.front || Object.values(imageMap)[0] || "";
  const marketing = prod.marketing_meta ?? {};

  // JSON-LD Microdata for Google Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: prod.name,
    image: imageUrl,
    description: prod.description || `Корпоративний одяг ${prod.name} з індивідуальним принтом або вишивкою.`,
    offers: {
      "@type": "Offer",
      url: `https://u-do-craft.store/products/${prod.slug || prod.id}`,
      priceCurrency: "UAH",
      price: Math.round((prod.base_price_cents || 0) / 100),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      deliveryLeadTime: {
        "@type": "QuantitativeValue",
        minValue: marketing.delivery_min_days ?? 7,
        maxValue: marketing.delivery_max_days ?? 14,
        unitCode: "DAY",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient
        product={prod}
        allProducts={prodList}
        variants={prodVariants}
        allVariants={allVariants}
        materials={materialsList}
      />
    </>
  );
}
