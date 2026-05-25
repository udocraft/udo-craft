"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Product, Material, ProductColorVariant } from "@udo-craft/shared";
import { createClient } from "@/lib/supabase/client";
import { useCms } from "@/hooks/useCms";
import { useCart } from "@/hooks/useCart";
import { useSoundInit } from "@/hooks/useSoundInit";

import { NavBar } from "@/app/_components/NavBar";
import { CartSidebar } from "@/app/_components/CartSidebar";
import { AuthModal } from "@/components/AuthModal";

// Above the fold
import { HeroSection } from "@/app/_sections/HeroSection";

// Lazy loaded below the fold
const SocialProofBar = dynamic(() => import("@/app/_sections/SocialProofBar").then(m => m.SocialProofBar), { ssr: true });
const ProblemSolutionSection = dynamic(() => import("@/app/_sections/ProblemSolutionSection").then(m => m.ProblemSolutionSection), { ssr: true });
const StatsSection = dynamic(() => import("@/app/_sections/StatsSection").then(m => m.StatsSection), { ssr: true });
const CollectionsSection = dynamic(() => import("@/app/_sections/CollectionsSection").then(m => m.CollectionsSection), { ssr: true });
const ProcessSection = dynamic(() => import("@/app/_sections/ProcessSection").then(m => m.ProcessSection), { ssr: true });
const BoxOfTouchSection = dynamic(() => import("@/app/_sections/BoxOfTouchSection").then(m => m.BoxOfTouchSection), { ssr: true });
const PopupStandSection = dynamic(() => import("@/app/_sections/PopupStandSection").then(m => m.PopupStandSection), { ssr: true });
const SubscriptionSection = dynamic(() => import("@/app/_sections/SubscriptionSection").then(m => m.SubscriptionSection), { ssr: true });
const DesignerSection = dynamic(() => import("@/app/_sections/DesignerSection").then(m => m.DesignerSection), { ssr: true });
const CustomizerPreviewSection = dynamic(() => import("@/app/_sections/CustomizerPreviewSection").then(m => m.CustomizerPreviewSection), { ssr: true });
const TrustSection = dynamic(() => import("@/app/_sections/TrustSection").then(m => m.TrustSection), { ssr: true });
const ComparisonSection = dynamic(() => import("@/app/_sections/ComparisonSection").then(m => m.ComparisonSection), { ssr: true });
const TestimonialsSection = dynamic(() => import("@/app/_sections/TestimonialsSection").then(m => m.TestimonialsSection), { ssr: true });
const FaqSection = dynamic(() => import("@/app/_sections/FaqSection").then(m => m.FaqSection), { ssr: true });
const FinalCtaSection = dynamic(() => import("@/app/_sections/FinalCtaSection").then(m => m.FinalCtaSection), { ssr: true });
const ContactSection = dynamic(() => import("@/app/_sections/ContactSection").then(m => m.ContactSection), { ssr: true });
const FooterSection = dynamic(() => import("@/app/_sections/FooterSection").then(m => m.FooterSection), { ssr: true });

interface Category {
  id: string; name: string; slug: string;
  sort_order: number; is_active: boolean; image_url?: string | null;
}
interface ProductWithCategory extends Product { category_id?: string | null; }

export function HomeClient({
  products,
  categories,
  materials,
  colorVariants,
  cmsData,
}: {
  products: ProductWithCategory[];
  categories: Category[];
  materials: Material[];
  colorVariants: ProductColorVariant[];
  cmsData: any;
}) {
  const { get } = useCms(cmsData);
  const supabase = createClient();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const { cart, cartCount, totalCents } = useCart();
  useSoundInit();

  useEffect(() => {
    void supabase.auth.getSession().then((r: { data: { session: unknown } }) => setIsLoggedIn(!!r.data.session));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden scroll-smooth">
      <NavBar isLoggedIn={isLoggedIn} cartCount={cartCount} onCartOpen={() => setCartOpen(true)} cinemaMode={cinemaMode} onAuthOpen={() => setAuthOpen(true)} />
      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} cartCount={cartCount} totalCents={totalCents} />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={() => { setIsLoggedIn(true); setAuthOpen(false); }}
      />

      <main>
        <HeroSection
          cinemaMode={cinemaMode}
          onCinemaEnter={() => setCinemaMode(true)}
          onCinemaExit={() => setCinemaMode(false)}
          heading={get("home_hero", "heading", "Одяг, який стає частиною вашої корпоративної ДНК")}
          subheading={get("home_hero", "subheading", "Ми створюємо речі, які стають улюбленими в гардеробі.")}
          ctaPrimaryText={get("home_hero", "cta_primary_text", "Переглянути каталог")}
          ctaPrimaryUrl={get("home_hero", "cta_primary_url", "#catalog")}
          ctaSecondaryText="Контакти"
        />
        <SocialProofBar />
        <ProblemSolutionSection />
        <StatsSection
          stat1Value={Number(get("home_stats", "stat1_value", "500"))}
          stat1Suffix={get("home_stats", "stat1_suffix", "+")}
          stat1Label={get("home_stats", "stat1_label", "Задоволених клієнтів")}
          stat2Value={Number(get("home_stats", "stat2_value", "15"))}
          stat2Suffix={get("home_stats", "stat2_suffix", "%")}
          stat2Label={get("home_stats", "stat2_label", "Знижка від 100 шт")}
          stat3Value={Number(get("home_stats", "stat3_value", "14"))}
          stat3Suffix={get("home_stats", "stat3_suffix", " дн")}
          stat3Label={get("home_stats", "stat3_label", "Середній термін")}
          stat4Value={Number(get("home_stats", "stat4_value", "100"))}
          stat4Suffix={get("home_stats", "stat4_suffix", "%")}
          stat4Label={get("home_stats", "stat4_label", "Контроль якості")}
        />
        <CollectionsSection products={products} categories={categories} materials={materials} colorVariants={colorVariants} />
        <ProcessSection />
        <BoxOfTouchSection />
        <PopupStandSection />
        <SubscriptionSection />
        <DesignerSection />
        <CustomizerPreviewSection />
        <TrustSection />
        <ComparisonSection />
        <TestimonialsSection />
        <FaqSection />
        <FinalCtaSection />
        <ContactSection
          heading={get("home_contact", "heading", "Зв'яжіться з нами")}
          subtext={get("home_contact", "subtext", "Розкажіть про ваш проєкт — надішлемо пропозицію протягом 24 годин.")}
          email={get("home_contact", "email", "info@udocraft.com")}
          phone={get("home_contact", "phone", "+380 63 070 33 072")}
          address={get("home_contact", "address", "м. Львів, вул. Джерельна, 69")}
          instagram={get("home_contact", "instagram", "https://www.instagram.com/u.do.craft/")}
          telegram={get("home_contact", "telegram", "https://t.me/udostore")}
        />
      </main>

      <FooterSection
        tagline={get("footer", "tagline", "B2B мерч-платформа для команд, брендів та подій.")}
        copyright={get("footer", "copyright", "U:DO CRAFT. Всі права захищені.")}
        instagram={get("home_contact", "instagram", "https://www.instagram.com/u.do.craft/")}
        telegram={get("home_contact", "telegram", "https://t.me/udostore")}
      />
    </div>
  );
}
