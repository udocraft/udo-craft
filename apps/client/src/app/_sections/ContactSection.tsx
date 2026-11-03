"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Instagram, Send } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";

interface ContactSectionProps {
  heading: string;
  subtext: string;
  email: string;
  phone: string;
  address: string;
  instagram: string;
  telegram: string;
}

export function ContactSection({
  heading, subtext, email, phone, address, instagram, telegram,
}: ContactSectionProps) {
  const tContact = useTranslations("contact");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="contact" className="bg-[#0a0d1a]" aria-labelledby="contact-heading">
      <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-20 py-24 sm:py-32">

        {/* Heading — full width, generous space below */}
        <motion.div ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20"
        >
          <h2 id="contact-heading"
            className="text-white font-black tracking-tight leading-[0.95] mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            {heading}
          </h2>
          <p className="text-white/50 text-base leading-relaxed max-w-sm">{subtext}</p>
        </motion.div>

        {/* Two columns — contact info left, form right */}
        <div className="grid lg:grid-cols-[1fr_1.6fr] gap-16 lg:gap-24 items-start">

          {/* Left — sparse, lots of space between items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-10"
          >
            {/* Contact items — no cards, no borders, just text */}
            <div className="space-y-8">
              {[
                { label: "Email", value: email, href: `mailto:${email}` },
                { label: tContact("phone"), value: phone, href: `tel:${phone.replace(/\s/g, "")}` },
                { label: tContact("address"), value: address, href: "#" },
              ].map((c) => (
                <a key={c.label} href={c.href}
                  className="block group"
                  aria-label={`${c.label}: ${c.value}`}
                >
                  <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mb-1.5">{c.label}</p>
                  <p className="text-white/70 text-base font-medium group-hover:text-white transition-colors duration-200">{c.value}</p>
                </a>
              ))}
            </div>

           

            {/* Social — minimal */}
            <div className="flex gap-3">
              {[
                { href: instagram, icon: Instagram, label: "Instagram" },
                { href: telegram, icon: Send, label: "Telegram" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                    aria-label={s.label}
                    className="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-all duration-200 text-xs font-medium">
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />{s.label}
                  </a>
                );
              })}
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <ContactForm />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
