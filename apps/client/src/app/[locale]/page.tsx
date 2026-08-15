import { createServiceClient } from "@/lib/supabase/service";
import { HomeClient } from "@/app/_components/HomeClient";

export default async function LocaleHomePage() {
  try {
    const service = createServiceClient();

    const [prodRes, catRes, matRes, varRes, cmsRes] = await Promise.all([
      service.from("products").select("*").eq("is_active", true).order("created_at", { ascending: true }),
      service.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      service.from("materials").select("*").eq("is_active", true),
      service.from("product_color_variants").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      service.from("cms_published").select("slug, body").eq("is_active", true),
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
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('DYNAMIC_SERVER_USAGE')) {
      throw err;
    }
    console.error("Error fetching home page data:", err);
    return (
      <HomeClient
        products={[]}
        categories={[]}
        materials={[]}
        colorVariants={[]}
        cmsData={{}}
      />
    );
  }
}
