import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { HomeClient } from "@/app/_components/HomeClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "U:DO CRAFT — B2B мерч-платформа",
  description: "Одяг, який стає частиною вашої корпоративної ДНК",
  openGraph: {
    title: "U:DO CRAFT — B2B мерч-платформа",
    description: "Одяг, який стає частиною вашої корпоративної ДНК",
    type: "website",
    url: "https://udocraft.com",
    siteName: "U:DO CRAFT",
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const service = createServiceClient();

  const [prodRes, catRes, matRes, varRes, cmsRes] = await Promise.all([
    service.from("products").select("*").eq("is_active", true).order("created_at", { ascending: true }),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("materials").select("*").eq("is_active", true),
    supabase.from("product_color_variants").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("cms_published").select("slug, body").eq("is_active", true),
  ]);

  const cmsData = (cmsRes.data || []).reduce((acc, item) => {
    acc[item.slug] = (item.body as any) || {};
    return acc;
  }, {} as Record<string, any>);

  return (
    <HomeClient
      products={prodRes.data || []}
      categories={catRes.data || []}
      materials={matRes.data || []}
      colorVariants={varRes.data || []}
      cmsData={cmsData}
    />
  );
}
