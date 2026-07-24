"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ChevronUp, Menu } from "lucide-react";
import { CmsTreeSidebar, CmsTreeDrawer, type TreeNode } from "./_components/CmsTree";
import { LandingSectionEditor, type SectionConfig } from "./_components/LandingSectionEditor";
import { PreviewPane } from "./_components/PreviewPane";

const BlockEditor = dynamic(
  () => import("./_components/BlockEditor").then((m) => ({ default: m.BlockEditor })),
  { ssr: false }
);

// ── Section Definitions ───────────────────────────────────────────────────────

const LAYOUT_SECTION: SectionConfig = {
  slug: "home_layout",
  label: "Структура сторінки",
  fields: [
    {
      key: "sections",
      label: "Порядок секцій",
      type: "repeater",
      itemLabelKey: "id",
      fields: [
        { key: "id", label: "ID секції", type: "input", placeholder: "hero, stats, services, trust, faq, popup, contact" },
        { key: "visible", label: "Видимість", type: "input", placeholder: "true/false" },
      ],
    },
  ],
};

const HERO_SECTION: SectionConfig = {
  slug: "home_hero",
  label: "Hero",
  fields: [
    { key: "heading",            label: "Заголовок",           type: "input",    placeholder: "Одяг, який стає частиною вашої корпоративної ДНК" },
    { key: "subheading",         label: "Підзаголовок",        type: "textarea", placeholder: "Короткий опис під заголовком" },
    { key: "cta_primary_text",   label: "Кнопка 1 — текст",   type: "input",    placeholder: "Переглянути каталог" },
    { key: "cta_primary_url",    label: "Кнопка 1 — посилання", type: "input",  placeholder: "#collections" },
    { key: "cta_secondary_text", label: "Кнопка 2 — текст",   type: "input",    placeholder: "Зв'язатись" },
    { key: "cta_secondary_url",  label: "Кнопка 2 — посилання", type: "input",  placeholder: "#contact" },
    { key: "badge1",             label: "Бейдж 1",             type: "input",    placeholder: "Від 10 одиниць" },
    { key: "badge2",             label: "Бейдж 2",             type: "input",    placeholder: "Гарантія якості" },
    { key: "badge3",             label: "Бейдж 3",             type: "input",    placeholder: "7–14 днів на виготовлення" },
  ],
};

const STATS_SECTION: SectionConfig = {
  slug: "home_stats",
  label: "Статистика",
  fields: [
    { key: "stat1_value",  label: "Показник 1 — число",  type: "input", placeholder: "500" },
    { key: "stat1_suffix", label: "Показник 1 — суфікс", type: "input", placeholder: "+" },
    { key: "stat1_label",  label: "Показник 1 — підпис", type: "input", placeholder: "Задоволених клієнтів" },
    { key: "stat2_value",  label: "Показник 2 — число",  type: "input", placeholder: "15" },
    { key: "stat2_suffix", label: "Показник 2 — суфікс", type: "input", placeholder: "%" },
    { key: "stat2_label",  label: "Показник 2 — підпис", type: "input", placeholder: "Знижка від 100 шт" },
    { key: "stat3_value",  label: "Показник 3 — число",  type: "input", placeholder: "14" },
    { key: "stat3_suffix", label: "Показник 3 — суфікс", type: "input", placeholder: " дн" },
    { key: "stat3_label",  label: "Показник 3 — підпис", type: "input", placeholder: "Середній термін" },
    { key: "stat4_value",  label: "Показник 4 — число",  type: "input", placeholder: "100" },
    { key: "stat4_suffix", label: "Показник 4 — суфікс", type: "input", placeholder: "%" },
    { key: "stat4_label",  label: "Показник 4 — підпис", type: "input", placeholder: "Контроль якості" },
  ],
};

const SERVICES_SECTION: SectionConfig = {
  slug: "home_services",
  label: "Послуги",
  fields: [
    { key: "heading",       label: "Заголовок секції",   type: "input",    placeholder: "Більше, ніж просто мерч" },
    { key: "service1_title", label: "Послуга 1 — назва", type: "input",    placeholder: "Box of Touch" },
    { key: "service1_desc",  label: "Послуга 1 — опис",  type: "textarea" },
    { key: "service1_cta",   label: "Послуга 1 — кнопка", type: "input",  placeholder: "Замовити зразки" },
    { key: "service2_title", label: "Послуга 2 — назва", type: "input",    placeholder: "Найми дизайнера" },
    { key: "service2_desc",  label: "Послуга 2 — опис",  type: "textarea" },
    { key: "service2_cta",   label: "Послуга 2 — кнопка", type: "input",  placeholder: "Обговорити проєкт" },
  ],
};

const TRUST_SECTION: SectionConfig = {
  slug: "home_trust",
  label: "Довіра",
  fields: [
    { key: "heading", label: "Заголовок", type: "input", placeholder: "Чому нам довіряють" },
    { key: "subtext", label: "Підзаголовок", type: "textarea", placeholder: "Не просто слова — конкретні гарантії..." },
    {
      key: "guarantees",
      label: "Гарантії",
      type: "repeater",
      itemLabelKey: "title",
      fields: [
        { key: "title", label: "Назва", type: "input", placeholder: "Гарантія якості" },
        { key: "body", label: "Опис", type: "textarea", placeholder: "Якщо виріб не відповідає..." },
      ],
    },
    {
      key: "numbers",
      label: "Показники (цифри)",
      type: "repeater",
      itemLabelKey: "label",
      fields: [
        { key: "value", label: "Значення", type: "input", placeholder: "500+" },
        { key: "label", label: "Підпис", type: "input", placeholder: "задоволених клієнтів" },
      ],
    },
  ],
};

const FAQ_SECTION: SectionConfig = {
  slug: "home_faq",
  label: "FAQ",
  fields: [
    { key: "heading", label: "Заголовок", type: "input", placeholder: "Часті запитання" },
    {
      key: "items",
      label: "Питання та відповіді",
      type: "repeater",
      itemLabelKey: "question",
      fields: [
        { key: "question", label: "Питання", type: "input" },
        { key: "answer", label: "Відповідь", type: "textarea" },
      ],
    },
  ],
};

const POPUP_SECTION: SectionConfig = {
  slug: "home_popup",
  label: "Popup-стенд",
  fields: [
    { key: "heading",        label: "Заголовок",    type: "input",    placeholder: "U:DO Craft Popup" },
    { key: "subheading",     label: "Підзаголовок", type: "textarea", placeholder: "Перетворіть ваш захід..." },
    { key: "cta_primary",    label: "Кнопка 1",     type: "input",    placeholder: "Дізнатись більше" },
    { key: "cta_secondary",  label: "Кнопка 2",     type: "input",    placeholder: "Обговорити захід" },
    { key: "feature1_icon",  label: "Фіча 1 — іконка", type: "input", placeholder: "🎪" },
    { key: "feature1_label", label: "Фіча 1 — назва",  type: "input", placeholder: "Виїзд на будь-який захід" },
    { key: "feature1_desc",  label: "Фіча 1 — опис",   type: "input", placeholder: "Конференції, фестивалі, корпоративи" },
    { key: "feature2_icon",  label: "Фіча 2 — іконка", type: "input", placeholder: "👕" },
    { key: "feature2_label", label: "Фіча 2 — назва",  type: "input", placeholder: "Кастомізація на місці" },
    { key: "feature2_desc",  label: "Фіча 2 — опис",   type: "input", placeholder: "Живий дизайн за 5 хвилин" },
    { key: "feature3_icon",  label: "Фіча 3 — іконка", type: "input", placeholder: "⚡" },
    { key: "feature3_label", label: "Фіча 3 — назва",  type: "input", placeholder: "Миттєвий результат" },
    { key: "feature3_desc",  label: "Фіча 3 — опис",   type: "input", placeholder: "Готовий мерч у руки гостей" },
    { key: "feature4_icon",  label: "Фіча 4 — іконка", type: "input", placeholder: "🎯" },
    { key: "feature4_label", label: "Фіча 4 — назва",  type: "input", placeholder: "Від 50 учасників" },
    { key: "feature4_desc",  label: "Фіча 4 — опис",   type: "input", placeholder: "Масштабуємо під ваш захід" },
  ],
};

const CONTACT_SECTION: SectionConfig = {
  slug: "home_contact",
  label: "Контакти",
  fields: [
    { key: "heading",   label: "Заголовок",    type: "input",    placeholder: "Зв'яжіться з нами" },
    { key: "subtext",   label: "Підтекст",     type: "textarea", placeholder: "Розкажіть про ваш проєкт..." },
    { key: "email",     label: "Email",        type: "input",    placeholder: "info@udocraft.com" },
    { key: "phone",     label: "Телефон",      type: "input",    placeholder: "+380 63 070 33 072" },
    { key: "address",   label: "Адреса",       type: "input",    placeholder: "м. Львів, вул. Джерельна, 69" },
    { key: "telegram",  label: "Telegram URL", type: "input",    placeholder: "https://t.me/udostore" },
    { key: "instagram", label: "Instagram URL", type: "input",   placeholder: "https://www.instagram.com/u.do.craft/" },
  ],
};

const FOOTER_SECTION: SectionConfig = {
  slug: "footer",
  label: "Футер",
  fields: [
    { key: "tagline",            label: "Слоган під логотипом", type: "input", placeholder: "B2B мерч-платформа для команд, брендів та подій." },
    { key: "copyright",          label: "Копірайт",             type: "input", placeholder: "U:DO CRAFT. Всі права захищені." },
    { key: "col_products_title", label: "Колонка «Продукти»",   type: "input", placeholder: "Продукти" },
    { key: "col_company_title",  label: "Колонка «Компанія»",   type: "input", placeholder: "Компанія" },
    { key: "col_support_title",  label: "Колонка «Підтримка»",  type: "input", placeholder: "Підтримка" },
    { key: "col_contacts_title", label: "Колонка «Контакти»",   type: "input", placeholder: "Контакти" },
  ],
};

const SEO_SECTION: SectionConfig = {
  slug: "seo_home",
  label: "SEO",
  fields: [
    { key: "title",       label: "Meta Title",       type: "input",    placeholder: "U:DO CRAFT — B2B мерч-платформа" },
    { key: "description", label: "Meta Description", type: "textarea", placeholder: "Корпоративний мерч від 10 одиниць..." },
    { key: "keywords",    label: "Keywords",         type: "input",    placeholder: "мерч, корпоративний одяг, футболки" },
    { key: "og_image",    label: "OG Image URL",     type: "input",    placeholder: "https://..." },
  ],
};

// Tree structure
const TREE: TreeNode[] = [
  {
    id: "landing",
    label: "Головна сторінка",
    icon: "🏠",
    type: "group",
    children: [
      { id: "home_layout",   label: "Структура",    icon: "🏗️", type: "section", section: LAYOUT_SECTION },
      { id: "home_hero",     label: "Hero",         icon: "✦",  type: "section", section: HERO_SECTION },
      { id: "home_stats",    label: "Статистика",   icon: "📊", type: "section", section: STATS_SECTION },
      { id: "home_services", label: "Послуги",      icon: "🛠", type: "section", section: SERVICES_SECTION },
      { id: "home_trust",    label: "Довіра",       icon: "🛡️", type: "section", section: TRUST_SECTION },
      { id: "home_faq",      label: "FAQ",          icon: "❓", type: "section", section: FAQ_SECTION },
      { id: "home_popup",    label: "Popup-стенд",  icon: "🎪", type: "section", section: POPUP_SECTION },
      { id: "home_contact",  label: "Контакти",     icon: "📞", type: "section", section: CONTACT_SECTION },
      { id: "footer",        label: "Футер",        icon: "⬇️", type: "section", section: FOOTER_SECTION },
      { id: "seo_home",      label: "SEO",          icon: "🔍", type: "section", section: SEO_SECTION },
    ],
  },
  {
    id: "pages",
    label: "Сторінки",
    icon: "📄",
    type: "group",
    children: [
      {
        id: "page_privacy",
        label: "Конфіденційність",
        icon: "🔒",
        type: "richpage",
        slug: "page_privacy",
        pageTitle: "Політика конфіденційності",
        description: "Відображається на /privacy",
      },
      {
        id: "page_terms",
        label: "Умови та правила",
        icon: "📋",
        type: "richpage",
        slug: "page_terms",
        pageTitle: "Умови та правила",
        description: "Відображається на /terms",
      },
    ],
  },
];

// ── Main layout ───────────────────────────────────────────────────────────────

export default function CmsPage() {
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [previewKey, setPreviewKey] = useState(Date.now());

  const handleSaved = () => {
    setPreviewKey(Date.now());
  };

  const editorContent = !selected || selected.type === "group" ? (
    <EmptyState onOpenMenu={() => setDrawerOpen(true)} />
  ) : selected.type === "section" && selected.section ? (
    <LandingSectionEditor key={selected.id} section={selected.section} onSaved={handleSaved} />
  ) : selected.type === "richpage" && selected.slug ? (
    <BlockEditor
      key={selected.id}
      slug={selected.slug}
      pageTitle={selected.pageTitle ?? selected.label}
      description={selected.description}
    />
  ) : null;

  return (
    <div className="flex h-[calc(100svh-3.5rem)] overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <CmsTreeSidebar nodes={TREE} selected={selected} onSelect={setSelected} />

      {/* Mobile bottom sheet */}
      <CmsTreeDrawer
        nodes={TREE}
        selected={selected}
        onSelect={setSelected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Right panel with split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor area */}
        <main className="flex-1 overflow-y-auto bg-white border-r border-border" aria-label="Редактор контенту">
          <div className="max-w-3xl mx-auto pb-16 md:pb-0 bg-white min-h-full">
            {editorContent}
          </div>
        </main>

        {/* Live Preview area */}
        <PreviewPane
          previewKey={previewKey}
          url={process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000"}
        />

        {/* Mobile bottom bar — only visible on mobile */}
        <div className="md:hidden shrink-0 border-t border-border bg-background">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Відкрити меню"
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <ChevronUp className="size-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              {selected && selected.type !== "group" ? (
                <div className="flex items-center gap-1.5">
                  {selected.icon && <span className="text-base" aria-hidden="true">{selected.icon}</span>}
                  <span className="text-sm font-semibold truncate">{selected.label}</span>
                </div>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">Редактор сайту</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center px-6 py-12">
      <div className="text-5xl" aria-hidden="true">✦</div>
      <div>
        <p className="text-base font-semibold text-foreground">Оберіть розділ</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Виберіть сторінку або секцію зліва, щоб почати редагування
        </p>
      </div>
      {/* Mobile hint button */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="md:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="size-4" />
        Відкрити меню
      </button>
    </div>
  );
}
