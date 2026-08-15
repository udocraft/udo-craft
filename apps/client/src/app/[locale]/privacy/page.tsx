import { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Політика конфіденційності — U:DO CRAFT",
};

async function getContent() {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("cms_content")
      .select("body")
      .eq("slug", "page_privacy")
      .single();
    return data?.body as { title?: string; html?: string } | null;
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('DYNAMIC_SERVER_USAGE')) {
      throw err;
    }
    return null;
  }
}

export default async function PrivacyPage() {
  const content = await getContent();
  const html = content?.html ?? "";

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-8">
          {content?.title || "Політика конфіденційності"}
        </h1>
        {html ? (
          <div
            className="prose prose-zinc max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-muted-foreground">Контент ще не додано.</p>
        )}
      </div>
    </main>
  );
}
