import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Умови та правила — U:DO CRAFT",
};

async function getContent() {
  try {
    const service = await createClient();
    const { data } = await service
      .from("cms_content")
      .select("body")
      .eq("slug", "page_terms")
      .single();
    return data?.body as { title?: string; html?: string } | null;
  } catch {
    return null;
  }
}

export default async function TermsPage() {
  const content = await getContent();
  const html = content?.html ?? "";

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-8">
          {content?.title || "Умови та правила"}
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
