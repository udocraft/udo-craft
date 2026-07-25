"use client";

import { Link } from "@/i18n/navigation";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Sparkles, Gift, Calculator } from "lucide-react";

export function LeadMagnetSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Введіть коректний email");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <section ref={ref} className="bg-primary py-16 sm:py-20 overflow-hidden relative" aria-labelledby="lead-magnet-heading">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
        aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-20 relative">
        <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-center">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-4 h-4 text-white" aria-hidden="true" />
              {/* white on primary = 4.8:1 AA */}
              <span className="text-white text-xs font-bold uppercase tracking-[0.18em]">Безкоштовно</span>
            </div>
            <h2 id="lead-magnet-heading" className="text-white text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-3">
              Отримай безкоштовний мокап свого мерчу
            </h2>
            <p className="text-white/80 text-sm leading-relaxed max-w-md">
              Завантаж логотип — ми накладемо його на реальний виріб і надішлемо мокап на пошту. Без реєстрації, без зобов'язань.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 w-full lg:w-auto"
          >
            {submitted ? (
              <div className="flex items-center gap-3 bg-white/15 border border-white/25 rounded-2xl px-6 py-4">
                <Sparkles className="w-5 h-5 text-white shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-white font-bold text-sm">Дякуємо!</p>
                  <p className="text-white/80 text-xs mt-0.5">Мокап надійде на пошту протягом 24 год</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate aria-label="Форма отримання мокапу">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label htmlFor="lead-email" className="sr-only">Ваш email</label>
                    <input
                      id="lead-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder="your@email.com"
                      aria-required="true"
                      aria-invalid={!!error}
                      aria-describedby={error ? "lead-email-error" : undefined}
                      className="w-full sm:w-64 px-4 py-3 rounded-full bg-white/15 border border-white/25 text-white placeholder:text-white/50 text-sm focus:outline-none focus:border-white/60 focus:bg-white/20 transition-all duration-200"
                    />
                  </div>
                  <button type="submit" disabled={loading}
                    className="inline-flex items-center justify-center gap-2 bg-white text-primary font-bold text-sm px-6 py-3 rounded-full hover:bg-white/90 active:scale-[0.97] transition-all duration-200 disabled:opacity-60 whitespace-nowrap">
                    {loading
                      ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" aria-hidden="true" />
                      : <><span>Отримати мокап</span><ArrowRight className="w-4 h-4" aria-hidden="true" /></>
                    }
                  </button>
                </div>
                {error && (
                  <p id="lead-email-error" role="alert" className="text-white text-xs mt-2 font-medium">{error}</p>
                )}
                <p className="text-white/60 text-[10px] mt-2">
                  Або одразу{" "}
                  <Link href="/order" className="underline underline-offset-2 hover:text-white transition-colors">
                    спробуй редактор
                  </Link>
                </p>
              </form>
            )}
          </motion.div>
        </div>

        {/* Secondary magnet — price calculator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 pt-8 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <Calculator className="w-5 h-5 text-white/70 shrink-0" aria-hidden="true" />
          <p className="text-white/80 text-sm">
            Хочеш дізнатись вартість прямо зараз?{" "}
            <Link href="/order" className="text-white font-semibold underline underline-offset-2 hover:no-underline transition-all">
              Відкрий калькулятор цін →
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
