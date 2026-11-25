-- CMS content table for dynamic page content management
create table if not exists public.cms_content (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null default '',
  body         jsonb not null default '{}',
  meta         jsonb default '{}',
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists cms_content_slug_idx on public.cms_content (slug);

alter table public.cms_content enable row level security;

drop policy if exists "Public can read cms_content" on public.cms_content;
create policy "Public can read cms_content" on public.cms_content for select using (true);

drop policy if exists "Authenticated users can upsert cms_content" on public.cms_content;
create policy "Authenticated users can upsert cms_content" on public.cms_content for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update cms_content" on public.cms_content;
create policy "Authenticated users can update cms_content" on public.cms_content for update to authenticated using (true);

-- ── Seed with current hardcoded landing values ────────────────────────────────
-- Uses INSERT ... ON CONFLICT DO UPDATE so re-running is safe and updates existing empty rows

insert into public.cms_content (slug, title, body) values
(
  'home_hero',
  'Hero',
  '{
    "heading": "Одяг, який стає частиною вашої корпоративної ДНК",
    "subheading": "Ринок перенасичений дешевим трендовим одягом. Ми створюємо речі, які стають улюбленими в гардеробі. Ваш мерч — це інструмент стратегічної комунікації.",
    "cta_primary_text": "Переглянути каталог",
    "cta_primary_url": "#collections",
    "cta_secondary_text": "Зв''язатись",
    "cta_secondary_url": "#contact",
    "badge1": "Від 10 одиниць",
    "badge2": "Гарантія якості",
    "badge3": "7–14 днів на виготовлення"
  }'
),
(
  'home_stats',
  'Статистика',
  '{
    "stat1_value": "500", "stat1_suffix": "+",   "stat1_label": "Задоволених клієнтів",
    "stat2_value": "15",  "stat2_suffix": "%",   "stat2_label": "Знижка від 100 шт",
    "stat3_value": "14",  "stat3_suffix": " дн", "stat3_label": "Середній термін",
    "stat4_value": "100", "stat4_suffix": "%",   "stat4_label": "Контроль якості"
  }'
),
(
  'home_services',
  'Послуги',
  '{
    "heading": "Більше, ніж просто мерч",
    "service1_title": "Box of Touch",
    "service1_desc": "Замов набір зразків тканин, кольорів та виробів — відчуй якість до того, як зробити тираж.",
    "service1_cta": "Замовити зразки",
    "service2_title": "Найми дизайнера",
    "service2_desc": "Немає готового логотипу? Наш дизайнер допоможе створити фірмовий стиль або адаптує логотип для нанесення.",
    "service2_cta": "Обговорити проєкт"
  }'
),
(
  'home_popup',
  'Popup-стенд',
  '{
    "heading": "U:DO Craft Popup",
    "subheading": "Перетворіть ваш захід на незабутній досвід. Виїзний попап-стенд з живою кастомізацією мерчу — гості створюють унікальний одяг і забирають його одразу.",
    "cta_primary": "Дізнатись більше",
    "cta_secondary": "Обговорити захід",
    "feature1_icon": "🎪", "feature1_label": "Виїзд на будь-який захід", "feature1_desc": "Конференції, фестивалі, корпоративи",
    "feature2_icon": "👕", "feature2_label": "Кастомізація на місці",    "feature2_desc": "Живий дизайн за 5 хвилин",
    "feature3_icon": "⚡", "feature3_label": "Миттєвий результат",       "feature3_desc": "Готовий мерч у руки гостей",
    "feature4_icon": "🎯", "feature4_label": "Від 50 учасників",         "feature4_desc": "Масштабуємо під ваш захід"
  }'
),
(
  'home_contact',
  'Контакти',
  '{
    "heading": "Зв''яжіться з нами",
    "subtext": "Розкажіть про ваш проєкт — ми підберемо оптимальне рішення та надішлемо пропозицію протягом 24 годин.",
    "email": "info@udocraft.com",
    "phone": "+380 63 070 33 072",
    "address": "м. Львів, вул. Джерельна, 69",
    "telegram": "https://t.me/udostore",
    "instagram": "https://www.instagram.com/u.do.craft/"
  }'
),
(
  'footer',
  'Футер',
  '{
    "tagline": "B2B мерч-платформа для команд, брендів та подій.",
    "copyright": "U:DO CRAFT. Всі права захищені.",
    "col_products_title": "Продукти",
    "col_company_title": "Компанія",
    "col_support_title": "Підтримка",
    "col_contacts_title": "Контакти"
  }'
),
(
  'seo_home',
  'SEO — Головна',
  '{
    "title": "U:DO CRAFT — B2B мерч-платформа для команд і брендів",
    "description": "Корпоративний мерч від 10 одиниць. Футболки, худі, аксесуари з вашим логотипом. Онлайн-конструктор, 7–14 днів виробництво, доставка по Україні.",
    "keywords": "мерч, корпоративний одяг, футболки з логотипом, худі, B2B мерч Україна",
    "og_image": ""
  }'
),
(
  'page_terms',
  'Умови та правила',
  '{"title":"Умови та правила","blocks":[]}'
),
(
  'page_privacy',
  'Політика конфіденційності',
  '{"title":"Політика конфіденційності","blocks":[]}'
)
on conflict (slug) do update
  set body = excluded.body,
      title = excluded.title,
      updated_at = now()
  where public.cms_content.body = '{}'::jsonb
     or public.cms_content.body = '{"title":"","blocks":[]}'::jsonb
     or public.cms_content.body = '{"title":"Умови та правила","blocks":[]}'::jsonb
     or public.cms_content.body = '{"title":"Політика конфіденційності","blocks":[]}'::jsonb;
