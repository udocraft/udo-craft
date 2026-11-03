"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { track } from "@/lib/analytics";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Upload, X, ChevronDown, Check } from "lucide-react";
import { sound } from "@/lib/sound";

const TOPICS = [
  { value: "merch",      icon: "👕" },
  { value: "popup",     icon: "🎪" },
  { value: "box",           icon: "📦" },
  { value: "designer",     icon: "🎨" },
  { value: "bulk",           icon: "🚀" },
  { value: "other",                 icon: "💬" },
] as const;

type TopicValue = typeof TOPICS[number]["value"];

function detectSource(): string {
  if (typeof window === "undefined") return "contact_form";
  // Support both ?ref= query param and hash-embedded params like #contact?ref=popup
  const params = new URLSearchParams(window.location.search);
  const hashParts = window.location.hash.split("?");
  const hashParams = hashParts.length > 1 ? new URLSearchParams(hashParts[1]) : new URLSearchParams();
  const ref = params.get("ref") ?? params.get("from") ?? hashParams.get("ref") ?? hashParts[0].replace("#", "");
  if (!ref) return "contact_form";
  const map: Record<string, string> = {
    popup: "popup_section", box: "box_of_touch",
    designer: "designer_service", services: "services_section", contact: "contact_section",
  };
  return map[ref] ?? ref;
}

function topicFromSource(source: string): TopicValue {
  if (source.includes("popup"))    return "popup";
  if (source.includes("box"))      return "box";
  if (source.includes("designer")) return "designer";
  if (source.includes("bulk"))     return "bulk";
  return "merch";
}

// Shared input class — taller to match landing page button height
const inputCls = "w-full h-[52px] bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-colors disabled:opacity-50";

export function ContactForm({ defaultTopic }: { defaultTopic?: TopicValue }) {
  const tForm = useTranslations("contactForm");
  const topics = TOPICS.map((tp) => ({
    ...tp,
    label: tForm(`topics.${tp.value}.label`),
    desc: tForm(`topics.${tp.value}.desc`),
  }));
  const [sent, setSent]             = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [company, setCompany]       = useState("");
  const [topic, setTopic]           = useState<TopicValue>(defaultTopic ?? "merch");
  const [topicOpen, setTopicOpen]   = useState(false);
  const [message, setMessage]       = useState("");
  const [files, setFiles]           = useState<File[]>([]);
  const [source, setSource]         = useState("contact_form");
  const [honeypot, setHoneypot]     = useState("");

  useEffect(() => {
    const apply = () => {
      const s = detectSource();
      setSource(s);
      if (!defaultTopic) setTopic(topicFromSource(s));
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [defaultTopic]);

  const selectedTopic = topics.find((t) => t.value === topic)!;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Analytics gets the form and topic only, never the visitor's name or email
      await track("form_submit", { form: "contact", topic, source });
      let attachmentUrls: string[] = [];
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (uploadRes.ok) { const { urls } = await uploadRes.json(); attachmentUrls = urls; }
      }
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "new",
          customer_data: { name, email, phone, company, topic, source, website: honeypot, attachments: attachmentUrls },
          total_amount_cents: 0,
          initial_message: message || null,
        }),
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || "Failed"); }
      sound.celebration();
      setSent(true);
    } catch (err) {
      console.error(err);
      setError(tForm("error"));
      sound.caution();
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-2xl">
        <p className="text-white/90 text-base font-medium">{tForm("success")}</p>
        <p className="text-white/70 text-sm mt-2">{tForm("successDesc")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4 max-w-2xl">
      {/* Honeypot field — hidden from real users, catches bots */}
      <input
        name="website"
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
      />

      <div className="space-y-1.5">
        <Label htmlFor="cf-name" className="text-white/60 text-xs font-semibold uppercase tracking-wide">{tForm("nameLabel")}</Label>
        <input id="cf-name" type="text" placeholder={tForm("namePlaceholder")} value={name}
          onChange={(e) => setName(e.target.value)} required disabled={submitting}
          onFocus={() => sound.tap()}
          className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-email" className="text-white/60 text-xs font-semibold uppercase tracking-wide">Email *</Label>
        <input id="cf-email" type="email" placeholder="hr@company.com" value={email}
          onChange={(e) => setEmail(e.target.value)} required disabled={submitting}
          onFocus={() => sound.tap()}
          className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-phone" className="text-white/60 text-xs font-semibold uppercase tracking-wide">{tForm("phoneLabel")}</Label>
        <input id="cf-phone" type="tel" placeholder="+380 XX XXX XX XX" value={phone}
          onChange={(e) => setPhone(e.target.value)} required disabled={submitting}
          onFocus={() => sound.tap()}
          className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-company" className="text-white/60 text-xs font-semibold uppercase tracking-wide">{tForm("companyLabel")}</Label>
        <input id="cf-company" type="text" placeholder={tForm("companyPlaceholder")} value={company}
          onChange={(e) => setCompany(e.target.value)} disabled={submitting}
          onFocus={() => sound.tap()}
          className={inputCls} />
      </div>

      {/* Topic picker */}
      <div className="md:col-span-2 space-y-1.5">
        <Label className="text-white/60 text-xs font-semibold uppercase tracking-wide">{tForm("topicLabel")}</Label>
        <Popover open={topicOpen} onOpenChange={setTopicOpen}>
          <PopoverTrigger
            disabled={submitting}
            className="w-full h-[52px] flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 text-left hover:bg-white/[0.08] hover:border-white/20 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <span className="text-xl shrink-0" aria-hidden="true">{selectedTopic.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-tight">{selectedTopic.label}</p>
              <p className="text-white/40 text-xs mt-0.5 truncate">{selectedTopic.desc}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform duration-200 ${topicOpen ? "rotate-180" : ""}`} />
          </PopoverTrigger>

          {/* Force dark bg with inline style — overrides CSS variable bg-popover */}
          <PopoverContent
            align="start"
            sideOffset={6}
            style={{
              width: "var(--anchor-width)",
              backgroundColor: "#0f172a",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            className="!bg-[#0f172a] p-1.5 shadow-2xl rounded-xl"
          >
            {topics.map((t) => (
              <button key={t.value} type="button"
                onClick={() => { setTopic(t.value); setTopicOpen(false); sound.select(); }}
                style={{ color: topic === t.value ? "#fff" : "rgba(255,255,255,0.7)" }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors focus:outline-none ${
                  topic === t.value ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span className="text-xl shrink-0" aria-hidden="true">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight" style={{ color: "#fff" }}>{t.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{t.desc}</p>
                </div>
                {topic === t.value && <Check className="w-4 h-4 shrink-0" style={{ color: "#fff" }} />}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:col-span-2 space-y-1.5">
        <Label htmlFor="cf-message" className="text-white/60 text-xs font-semibold uppercase tracking-wide">{tForm("messageLabel")}</Label>
        <textarea id="cf-message" placeholder={tForm("messagePlaceholder")}
          rows={4} value={message} onChange={(e) => setMessage(e.target.value)} disabled={submitting}
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-colors resize-none disabled:opacity-50" />
      </div>

      <div className="md:col-span-2 space-y-1.5">
        <Label htmlFor="cf-files" className="text-white/60 text-xs font-semibold uppercase tracking-wide">
          {tForm("filesLabel")}
        </Label>
        <div className="relative">
          <input id="cf-files" type="file" multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            disabled={submitting} className="hidden" />
          <label htmlFor="cf-files"
            className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-white/40 hover:bg-white/5 transition-colors">
            <Upload className="w-8 h-8 text-white/40 mb-2" aria-hidden="true" />
            <p className="text-white/70 text-sm font-medium">{tForm("filesClick")}</p>
            <p className="text-white/50 text-xs mt-1">{tForm("filesDesc")}</p>
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                  <span className="text-white/70 text-xs truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    aria-label={tForm("deleteFile", { name: f.name })}
                    className="text-white/50 hover:text-white/70 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-white/20">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="md:col-span-2" role="alert">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="md:col-span-2">
        <button type="submit" disabled={submitting}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-sm px-8 py-3.5 rounded-full active:scale-95 transition-all duration-200 disabled:opacity-50">
          {submitting ? (
            <><Loader2 className="size-4 animate-spin" aria-hidden="true" />{tForm("submitting")}</>
          ) : tForm("submit")}
        </button>
      </div>
    </form>
  );
}
