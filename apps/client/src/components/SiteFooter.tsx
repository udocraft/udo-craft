import { Link } from "@/i18n/navigation";
import { Instagram, Send } from "lucide-react";
import { BrandLogoFull } from "@/components/brand-logo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-5">
            <Link href="/" aria-label="U:DO CRAFT">
              <BrandLogoFull className="h-8 w-auto" color="var(--color-primary)" />
            </Link>
            <p className="text-xs leading-relaxed text-gray-500 max-w-[180px]">
              B2B мерч-платформа для команд, брендів та подій.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://www.instagram.com/u.do.craft/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                <Instagram className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <a href="https://t.me/udostore" target="_blank" rel="noopener noreferrer" aria-label="Telegram"
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Products */}
          <div className="flex flex-col gap-4">
            <p className="text-white text-xs font-semibold tracking-wide">Продукти</p>
            <nav className="flex flex-col gap-2.5" aria-label="Продукти">
              {[
                { href: "/order",        label: "Конструктор мерчу" },
                { href: "/#catalog", label: "Каталог" },
                { href: "/popup",        label: "Popup-стенд" },
                { href: "/#contact",     label: "Box of Touch" },
                { href: "/#contact",     label: "Найми дизайнера" },
              ].map((l) => (
                <Link key={l.label} href={l.href}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200 w-fit">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-4">
            <p className="text-white text-xs font-semibold tracking-wide">Компанія</p>
            <nav className="flex flex-col gap-2.5" aria-label="Компанія">
              {[
                { href: "/#how",     label: "Як це працює" },
                { href: "/#contact", label: "Про нас" },
                { href: "/#contact", label: "Кар'єра" },
                { href: "/#contact", label: "Блог" },
              ].map((l) => (
                <Link key={l.label} href={l.href}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200 w-fit">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Support */}
          <div className="flex flex-col gap-4">
            <p className="text-white text-xs font-semibold tracking-wide">Підтримка</p>
            <nav className="flex flex-col gap-2.5" aria-label="Підтримка">
              {[
                { href: "/#contact", label: "Зв'язатись з нами" },
                { href: "/cabinet",  label: "Особистий кабінет" },
                { href: "/#contact", label: "FAQ" },
                { href: "/#contact", label: "Доставка та оплата" },
              ].map((l) => (
                <Link key={l.label} href={l.href}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200 w-fit">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <p className="text-white text-xs font-semibold tracking-wide">Контакти</p>
            <div className="flex flex-col gap-2.5">
              <a href="mailto:info@udocraft.com"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200 w-fit">
                info@udocraft.com
              </a>
              <a href="tel:+380630703072"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-200 w-fit">
                +380 63 070 33 072
              </a>
              <p className="text-xs text-gray-600 leading-relaxed">
                м. Львів,<br />вул. Джерельна, 69
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-gray-600 text-center sm:text-left">
          © {year} U:DO CRAFT. Всі права захищені.
        </p>
        <div className="flex items-center gap-5">
          {[
            { href: "/privacy", label: "Конфіденційність" },
            { href: "/terms",   label: "Умови використання" },
          ].map((l) => (
            <Link key={l.label} href={l.href}
              className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors duration-200">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
