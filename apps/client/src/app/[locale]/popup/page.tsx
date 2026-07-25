"use client";

import { Link } from "@/i18n/navigation";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, User } from "lucide-react";
import { BrandLogoFull } from "@/components/brand-logo";
import { ContactForm } from "@/components/ContactForm";
import { motion, useInView } from "framer-motion";

const steps = [
  { step: "01", title: "Обираєте формат", desc: "Розкажіть нам про захід — кількість гостей, локація, дата. Ми підберемо оптимальний формат попапу." },
  { step: "02", title: "Готуємо стенд", desc: "Привозимо обладнання, одяг і все необхідне для кастомізації. Налаштовуємо стенд до початку заходу." },
  { step: "03", title: "Гості кастомізують", desc: "Кожен гість обирає виріб, розміщує принт і отримує готовий мерч прямо на місці — за лічені хвилини." },
];

const useCases = [
  { icon: "🏢", title: "Корпоративи", desc: "Зробіть корпоратив незабутнім — гості йдуть додому з персональним мерчем вашої компанії." },
  { icon: "🎤", title: "Конференції та форуми", desc: "Брендований мерч на місці — найкращий нетворкінг-інструмент і пам'ять про подію." },
  { icon: "🎪", title: "Фестивалі та маркети", desc: "Попап-стенд, який привертає увагу і генерує чергу. Живий досвід кастомізації — це шоу." },
  { icon: "🚀", title: "Продуктові лончі", desc: "Запуск продукту з мерчем, який гості зробили власноруч — максимальне залучення аудиторії." },
  { icon: "🎓", title: "Університети та школи", desc: "Випускні, дні відкритих дверей, студентські заходи — мерч, який об'єднує спільноту." },
  { icon: "💼", title: "B2B-заходи", desc: "Партнерські зустрічі, виставки, презентації — залиште враження, яке носять." },
];

const faqs = [
  { q: "Яка мінімальна кількість учасників?", a: "Від 50 осіб. Для менших заходів можемо запропонувати альтернативний формат — напишіть нам." },
  { q: "Скільки часу займає кастомізація одного виробу?", a: "Від 3 до 10 хвилин залежно від складності принту. Для великих заходів розгортаємо кілька робочих станцій." },
  { q: "Які вироби доступні на попапі?", a: "Футболки, худі, лонгсліви, кепки та аксесуари. Фінальний асортимент узгоджуємо під ваш захід і бюджет." },
  { q: "Хто оплачує мерч — організатор чи гості?", a: "Обидва варіанти. Можна включити мерч у вартість квитка, зробити подарунком від компанії або продавати на місці." },
  { q: "За скільки потрібно бронювати?", a: "Рекомендуємо за 2–3 тижні до заходу. Для великих подій (500+ осіб) — за місяць." },
];

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = end / (1500 / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, end]);
  return <span ref={ref}>{count}{suffix}</span>;
}

export default function PopupPage() {
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      if (y < 120) { setNavVisible(true); }
      else if (y > lastScrollY.current + 8) { setNavVisible(false); }
      else if (y < lastScrollY.current - 8) { setNavVisible(true); }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#use-cases", label: "Для кого" },
    { href: "#how",       label: "Як це працює" },
    { href: "#faq",       label: "FAQ" },
    { href: "#contact",   label: "Контакти" },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <motion.div
        initial={{ opacity: 1 }} animate={{ opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="fixed inset-0 bg-white z-[100] pointer-events-none"
      />

      {/* NAV — floating pill (same as landing) */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: navVisible ? 0 : -80, opacity: navVisible ? 1 : 0 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1], delay: 0.6 }}
        className="fixed top-4 inset-x-0 z-50 flex justify-center pointer-events-none px-4"
        aria-label="Навігація"
      >
        <div className={`pointer-events-auto inline-flex items-center gap-2 h-12 px-3 rounded-full bg-background border border-border transition-shadow duration-300 ${scrolled ? "shadow-lg" : "shadow-md"}`}>
          <Link href="/" aria-label="U:DO CRAFT" className="shrink-0 pl-1 pr-2">
            <BrandLogoFull className="h-6 w-auto" color="var(--color-primary, #1B18AC)" />
          </Link>
          <div className="hidden md:block w-px h-5 bg-border shrink-0" />
          <div className="hidden md:flex items-center">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:block w-px h-5 bg-border shrink-0" />
          <div className="flex items-center gap-0.5">
            <Link href="/" aria-label="Головна"
              className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <User className="w-4 h-4" />
            </Link>
            <Link href="#contact"
              className="hidden sm:inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3.5 py-2 rounded-full hover:bg-primary/90 active:scale-95 transition-all duration-200 whitespace-nowrap ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Забронювати
              <ArrowRight className="w-3 h-3" />
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Закрити меню" : "Відкрити меню"}
              aria-expanded={menuOpen}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors duration-200 ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex flex-col justify-center gap-[4px] w-[14px] h-[14px]">
                <motion.span animate={menuOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }}
                  className="block h-[1.5px] w-full bg-foreground rounded-full origin-center" />
                <motion.span animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }} transition={{ duration: 0.2 }}
                  className="block h-[1.5px] w-full bg-foreground rounded-full origin-center" />
                <motion.span animate={menuOpen ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }}
                  className="block h-[1.5px] w-full bg-foreground rounded-full origin-center" />
              </div>
            </button>
          </div>
        </div>
        <div className={`absolute top-[calc(100%+8px)] left-4 right-4 overflow-hidden transition-all duration-300 ease-in-out rounded-2xl ${menuOpen ? "max-h-64 opacity-100 pointer-events-auto" : "max-h-0 opacity-0 pointer-events-none"}`}>
          <div className="bg-background border border-border shadow-xl rounded-2xl px-4 py-3 space-y-1">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {l.label}
              </Link>
            ))}
            <Link href="#contact" onClick={() => setMenuOpen(false)}
              className="block mt-1 text-center bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-primary/90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Забронювати
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gray-950 pt-32 pb-20 sm:pt-44 sm:pb-28">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Виїзний попап-сервіс
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="text-white text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight mb-6"
          >
            Мерч-попап на вашому заході —<br />
            <span className="text-white/50">живий досвід, який запам&apos;ятовують</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-white/70 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10"
          >
            Ми приїжджаємо до вас. Гості обирають одяг, кастомізують принт на місці і йдуть з готовим мерчем у руках. Жодної логістики з вашого боку — тільки wow-ефект.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="flex flex-wrap justify-center gap-3"
          >
            <a href="#contact"
              className="inline-flex items-center gap-2 bg-primary text-white font-bold text-sm px-7 py-3.5 rounded-full hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200">
              Забронювати попап <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#how"
              className="inline-flex items-center gap-2 border border-white/20 text-white/80 font-semibold text-sm px-7 py-3.5 rounded-full hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-200">
              Як це працює
            </a>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <FadeUp>
        <section className="border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
              {[
                { value: 50,  suffix: "+",   label: "Проведених попапів" },
                { value: 3,   suffix: " хв", label: "Час кастомізації" },
                { value: 500, suffix: "+",   label: "Гостей на одному заході" },
                { value: 100, suffix: "%",   label: "Задоволених організаторів" },
              ].map((s) => (
                <div key={s.label} className="py-6 px-4 sm:px-6 text-center">
                  <p className="text-2xl font-black text-primary">
                    <CountUp end={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeUp>

      {/* USE CASES */}
      <section id="use-cases" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <FadeUp>
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-2 text-primary">Для кого</p>
            <h2 className="text-3xl font-black tracking-tight">Підходить для будь-якого заходу</h2>
          </div>
        </FadeUp>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {useCases.map((u, i) => (
            <FadeUp key={u.title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-200 h-full"
              >
                <span className="text-3xl mb-4 block" aria-hidden="true">{u.icon}</span>
                <h3 className="font-bold text-gray-900 mb-2">{u.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{u.desc}</p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20 sm:py-24 bg-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <FadeUp>
            <div className="mb-14">
              <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">Процес</p>
              <h2 className="text-white text-3xl sm:text-4xl font-black tracking-tight">Три кроки до ідеального попапу</h2>
            </div>
          </FadeUp>
          <div className="grid md:grid-cols-3 gap-4">
            {steps.map((item, i) => (
              <FadeUp key={item.step} delay={i * 0.15}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 rounded-2xl p-7 flex flex-col gap-5 h-full"
                >
                  <span className="text-white/40 text-5xl font-black leading-none select-none">{item.step}</span>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-white/75 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <FadeUp>
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-2 text-primary">FAQ</p>
            <h2 className="text-3xl font-black tracking-tight">Часті запитання</h2>
          </div>
        </FadeUp>
        <div className="grid md:grid-cols-2 gap-4">
          {faqs.map((f, i) => (
            <FadeUp key={f.q} delay={i * 0.07}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200"
              >
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{f.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.a}</p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="bg-gray-900 py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <FadeUp>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-4 text-primary">Забронювати</p>
                <h2 className="text-white text-3xl sm:text-4xl font-black tracking-tight mb-4">
                  Розкажіть нам про ваш захід
                </h2>
                <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-sm">
                  Залиште заявку — менеджер зв&apos;яжеться з вами протягом одного робочого дня, щоб обговорити деталі та розрахувати вартість.
                </p>
                <div className="space-y-3">
                  {[
                    "Безкоштовна консультація",
                    "Індивідуальний розрахунок під ваш захід",
                    "Відповідь протягом 24 годин",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-white/70 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={0.2}>
              <ContactForm />
            </FadeUp>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogoFull className="h-7 w-auto opacity-60" />
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} U:DO CRAFT. Всі права захищені.</p>
        </div>
      </footer>
    </div>
  );
}
