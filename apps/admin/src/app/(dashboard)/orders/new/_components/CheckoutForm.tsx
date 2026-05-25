"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, X, Upload, Plus } from "lucide-react";
import type { CartItem } from "./CartSummary";
import { PREDEFINED_TAGS, DELIVERY_OPTIONS } from "../_lib/constants";
import { useCipherText } from "./useCipherText";

export interface ContactData {
  name: string; email: string; phone: string; company: string; edrpou: string;
  socialNetwork: string; socialHandle: string; delivery: string;
  novaPoshtaDetails: string; deadline: string; comment: string;
}

interface CheckoutFormProps {
  contact: ContactData;
  setContact: React.Dispatch<React.SetStateAction<ContactData>>;
  orderTags: string[];
  setOrderTags: React.Dispatch<React.SetStateAction<string[]>>;
  extraFiles: File[];
  setExtraFiles: React.Dispatch<React.SetStateAction<File[]>>;
  cart: CartItem[];
  totalCents: number;
  onReview: () => void;
  onBack: () => void;
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CheckoutForm({
  contact, setContact, orderTags, setOrderTags,
  extraFiles, setExtraFiles,
  onReview, onBack,
}: CheckoutFormProps) {
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");
  const [highlightRequired, setHighlightRequired] = useState(false);
  const cipherText = useCipherText(true);

  const set = (field: keyof ContactData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setContact((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleTag = (id: string) =>
    setOrderTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  const canProceed = contact.name.trim() && contact.phone.trim() &&
    (contact.delivery !== "nova_poshta" || contact.novaPoshtaDetails.trim());

  const handleNext = () => {
    if (!canProceed) { setHighlightRequired(true); setTimeout(() => setHighlightRequired(false), 1000); return; }
    onReview();
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl font-black tracking-tight">Контактні дані</CardTitle>
          <CardDescription>Заповніть інформацію про клієнта та деталі доставки</CardDescription>
        </CardHeader>
      </Card>

      <Card variant="glass" className="p-2">
        <CardContent className="space-y-8 pt-6">
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ім&apos;я та прізвище *</Label>
              <Input type="text" value={contact.name} onChange={set("name")}
                placeholder={cipherText}
                className={`h-11 rounded-xl border-border/40 bg-background/50 focus:bg-background transition-all font-mono placeholder:font-mono ${!contact.name && highlightRequired ? "ring-2 ring-destructive/20 border-destructive animate-shake" : ""}`} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Телефон *</Label>
              <Input type="tel" value={contact.phone} onChange={set("phone")}
                placeholder="+380 XX XXX XX XX"
                className={`h-11 rounded-xl border-border/40 bg-background/50 focus:bg-background transition-all ${!contact.phone && highlightRequired ? "ring-2 ring-destructive/20 border-destructive animate-shake" : ""}`} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</Label>
              <Input type="email" value={contact.email} onChange={set("email")} placeholder="hr@company.com" 
                className="h-11 rounded-xl border-border/40 bg-background/50 focus:bg-background transition-all" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Компанія / ЄДРПОУ</Label>
              <div className="flex gap-2">
                <Input type="text" value={contact.company} onChange={set("company")} placeholder="Назва..." className="h-11 rounded-xl border-border/40 bg-background/50 focus:bg-background transition-all flex-1" />
                <Input type="text" value={contact.edrpou} onChange={set("edrpou")} placeholder="ЄДРПОУ" className="h-11 rounded-xl border-border/40 bg-background/50 focus:bg-background transition-all w-28" />
              </div>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Соцмережа</Label>
              <div className="flex gap-2">
                <select value={contact.socialNetwork} onChange={set("socialNetwork")}
                  className="h-11 shrink-0 rounded-xl border border-border/40 bg-background/50 px-3 text-sm font-bold focus:bg-background transition-all outline-none">
                  {["Instagram", "Telegram", "Facebook", "TikTok", "Viber"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <Input type="text" value={contact.socialHandle} onChange={set("socialHandle")}
                  placeholder="@username" className="h-11 rounded-xl border-border/40 bg-background/50 focus:bg-background transition-all flex-1" />
              </div>
            </div>
          </div>

          <div className="h-px bg-border/40 w-full" />

          {/* Delivery */}
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Спосіб доставки</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DELIVERY_OPTIONS.map((opt) => (
                <button key={opt.id} type="button"
                  onClick={() => setContact((prev) => ({ ...prev, delivery: opt.id }))}
                  className={`text-left p-4 rounded-2xl border transition-all duration-300 ${
                    contact.delivery === opt.id 
                      ? "border-primary bg-primary/[0.03] ring-2 ring-primary/20 shadow-md scale-[1.02]" 
                      : "border-border/40 hover:border-primary/20 hover:bg-background/50"
                  }`}
                >
                  <p className="text-sm font-bold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
            {contact.delivery === "nova_poshta" && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <Input type="text" value={contact.novaPoshtaDetails} onChange={set("novaPoshtaDetails")}
                  placeholder="Місто, відділення або номер поштомату"
                  className={`h-11 rounded-xl border-border/40 bg-background/50 focus:bg-background transition-all ${!contact.novaPoshtaDetails.trim() && highlightRequired ? "ring-2 ring-destructive/20 border-destructive animate-shake" : ""}`} />
              </div>
            )}
          </div>

          <div className="h-px bg-border/40 w-full" />

          {/* Tags */}
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Теги замовлення</Label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_TAGS.map((tag) => {
                const active = orderTags.includes(tag.id);
                return (
                  <button 
                    key={tag.id} 
                    type="button" 
                    onClick={() => toggleTag(tag.id)}
                    className={`inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold transition-all duration-300 border ${
                      active 
                        ? "shadow-sm scale-105" 
                        : "bg-background/40 border-border/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                    }`}
                    style={{ 
                      color: active ? tag.color : undefined, 
                      backgroundColor: active ? `${tag.color}15` : undefined, 
                      borderColor: active ? `${tag.color}40` : undefined 
                    }}
                  >
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: tag.color, opacity: active ? 1 : 0.4 }} />
                    {tag.label}
                  </button>
                );
              })}

              {orderTags
                .filter((t) => !PREDEFINED_TAGS.find((p) => p.id === t))
                .map((tag) => (
                  <Badge 
                    key={tag}
                    variant="secondary"
                    className="h-9 px-4 rounded-xl gap-2 bg-muted/40 border-border/40"
                  >
                    {tag}
                    <button type="button" onClick={() => toggleTag(tag)} className="opacity-40 hover:opacity-100 transition-opacity">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}

              <form 
                className="inline-flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = customTagInput.trim();
                  if (!val || orderTags.includes(val)) return;
                  setOrderTags((prev) => [...prev, val]);
                  setCustomTagInput("");
                }}
              >
                <input
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  placeholder="Свій тег..."
                  className="h-9 text-xs font-bold border border-dashed border-border/60 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-transparent placeholder:text-muted-foreground/50 w-28 transition-all focus:w-40"
                />
                {customTagInput.trim() && (
                  <Button type="submit" size="icon" className="size-9 rounded-xl shadow-md">
                    <Plus className="size-4" />
                  </Button>
                )}
              </form>
            </div>
          </div>

          {/* Details Toggle */}
          <div className="pt-4">
            <button 
              type="button" 
              onClick={() => setShowExtraDetails(!showExtraDetails)}
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all px-2"
            >
              <div className={`size-6 rounded-lg bg-muted flex items-center justify-center transition-all group-hover:bg-primary/10 ${showExtraDetails ? "rotate-90 bg-primary/10 text-primary" : ""}`}>
                <ChevronRight className="size-3.5" />
              </div>
              {showExtraDetails ? "Сховати додаткове" : "Додати коментар та файли"}
            </button>

            {showExtraDetails && (
              <div className="mt-6 space-y-6 animate-in slide-in-from-top-4 fade-in duration-500">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Бажаний дедлайн</Label>
                  <Input type="date" value={contact.deadline} onChange={set("deadline")} className="h-11 rounded-xl border-border/40 bg-background/50 focus:bg-background transition-all w-full sm:w-60" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Коментар до замовлення</Label>
                  <textarea 
                    value={contact.comment} 
                    onChange={set("comment")}
                    placeholder="Будь-які додаткові побажання..." 
                    rows={4}
                    className="w-full px-4 py-3 border border-border/40 rounded-2xl text-sm font-medium bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" 
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Макети та логотипи</Label>
                  <input type="file" multiple id="extra-files-admin" className="hidden"
                    onChange={(e) => setExtraFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])} />
                  <label 
                    htmlFor="extra-files-admin"
                    className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-border/60 rounded-3xl cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all group"
                  >
                    <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                      <Upload className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-bold text-foreground">Натисніть або перетягніть файли</p>
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium uppercase tracking-wider opacity-60">AI, PDF, SVG, PNG</p>
                  </label>
                  
                  {extraFiles.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                      {extraFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-background/40 rounded-xl border border-border/40 backdrop-blur-sm shadow-sm group hover:border-primary/20 transition-all">
                          <span className="text-xs font-bold truncate max-w-[200px]">{f.name}</span>
                          <button 
                            type="button" 
                            onClick={() => setExtraFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="size-6 rounded-lg flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-4 z-20 -mx-2 mt-4 flex gap-3 rounded-2xl border border-border/60 bg-background/85 p-3 shadow-xl backdrop-blur-xl">
            <Button variant="outline" size="lg" className="flex-1 rounded-full font-semibold" onClick={onBack}>Назад</Button>
            <Button size="lg" className="flex-1 rounded-full font-semibold shadow-lg shadow-primary/20" onClick={handleNext} disabled={!canProceed}>
              Перевірити замовлення
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
