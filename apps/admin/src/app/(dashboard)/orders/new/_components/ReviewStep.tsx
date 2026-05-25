"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import type { CartItem } from "./CartSummary";
import { PREDEFINED_TAGS, DELIVERY_OPTIONS } from "../_lib/constants";

const KEY_LABELS: Record<string, string> = { front: "Перед", back: "Зад", left: "Ліво", right: "Право" };

interface ContactData {
  name: string; email: string; phone: string; company: string; edrpou: string;
  socialNetwork: string; socialHandle: string; delivery: string;
  novaPoshtaDetails: string; deadline: string; comment: string;
}

interface ReviewStepProps {
  cart: CartItem[];
  totalCents: number;
  contact: ContactData;
  orderTags: string[];
  extraFiles: File[];
  generatingPdf: boolean;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onDownloadInvoice: () => void;
}

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ReviewStep({ cart, totalCents, contact, orderTags, extraFiles, generatingPdf, submitting, onBack, onSubmit, onDownloadInvoice }: ReviewStepProps) {
  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-2xl font-black tracking-tight text-foreground">Перевірте замовлення</h2>
        <p className="text-sm text-muted-foreground font-medium">Останній крок перед створенням. Переконайтеся, що всі дані вірні.</p>
      </div>

      <Card className="overflow-hidden border-border/40 shadow-premium bg-card/50 backdrop-blur-md">
        <CardContent className="p-0">
          <div className="p-6 md:p-10 space-y-12">
            {/* Products Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Товари ({cart.length})</h3>
                <Badge variant="success" className="h-6 gap-1.5 px-3">
                  <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Готово до друку
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {cart.map((item, i) => {
                  const lineTotal = (item.unitPriceCents + item.printCostCents) * item.quantity / 100;
                  const mockupKeys = item.mockupsMap ? Object.keys(item.mockupsMap).filter((k) => item.mockupsMap![k]) : [];
                  
                  return (
                    <div key={i} className="group relative flex flex-col sm:flex-row gap-6 p-5 rounded-3xl bg-background/40 border border-border/40 hover:border-primary/20 hover:bg-background/60 transition-all duration-300">
                      {/* Mockup Preview */}
                      <div className="shrink-0">
                        {mockupKeys.length > 0 ? (
                          <div className="flex gap-2">
                            {mockupKeys.slice(0, 2).map((key) => (
                              <div key={key} className="relative size-24 bg-white rounded-2xl overflow-hidden border border-border/40 shadow-sm p-1.5 group-hover:scale-105 transition-transform">
                                <img src={item.mockupsMap![key]} alt={key} className="w-full h-full object-contain" />
                                <div className="absolute inset-x-1 bottom-1 text-[8px] font-black uppercase tracking-wider text-center bg-black/70 backdrop-blur-md text-white py-0.5 rounded-lg">
                                  {KEY_LABELS[key] ?? key}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="size-24 bg-white rounded-2xl overflow-hidden border border-border/40 shadow-sm p-1.5 group-hover:scale-105 transition-transform">
                            <img src={item.mockupDataUrl || item.productImage} alt={item.productName} className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{item.productName}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="secondary" className="h-5 px-2 bg-muted/50 font-bold">{item.size}</Badge>
                              <Badge variant="secondary" className="h-5 px-2 bg-muted/50 font-bold">{item.color}</Badge>
                              <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest ml-1">× {item.quantity} шт</span>
                            </div>
                          </div>
                          <p className="text-lg font-black text-primary tracking-tight">₴{lineTotal.toFixed(0)}</p>
                        </div>

                        {item.layers && item.layers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.layers.map((layer, li) => (
                              <Badge key={li} variant="info" className="text-[9px] h-5 font-bold">
                                {layer.side}: {layer.type}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {item.itemNote && (
                          <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                            <p className="text-[10px] text-muted-foreground/70 font-medium italic leading-relaxed">&ldquo;{item.itemNote}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
              {/* Contact Details */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 border-b border-border/40 pb-3">Клієнт</h3>
                <div className="grid grid-cols-1 gap-6">
                  {[
                    { label: "Ім'я", value: contact.name, mono: true },
                    { label: "Телефон", value: contact.phone },
                    { label: "Email", value: contact.email },
                    { label: "Компанія / ЄДРПОУ", value: contact.company ? `${contact.company} (${contact.edrpou})` : null },
                    { label: "Соцмережа", value: contact.socialHandle ? `${contact.socialNetwork}: ${contact.socialHandle}` : null },
                  ].map(({ label, value, mono }) => value && (
                    <div key={label} className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{label}</p>
                      <p className={`text-sm font-bold text-foreground ${mono ? "font-mono tracking-tight" : ""}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery & Logistics */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 border-b border-border/40 pb-3">Логістика</h3>
                <div className="space-y-6">
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Доставка</p>
                    <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10 inline-flex items-center gap-2 shadow-sm">
                      <div className="size-2 rounded-full bg-primary animate-pulse" />
                      <p className="text-sm font-bold text-primary">{DELIVERY_OPTIONS.find((o) => o.id === contact.delivery)?.label}</p>
                    </div>
                    {contact.novaPoshtaDetails && (
                      <p className="text-xs font-semibold text-muted-foreground/70 mt-1 pl-1">{contact.novaPoshtaDetails}</p>
                    )}
                  </div>

                  {contact.deadline && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Дедлайн</p>
                      <Badge variant="warning" className="h-7 px-3 font-black text-[10px]">
                        {new Date(contact.deadline).toLocaleDateString("uk-UA")}
                      </Badge>
                    </div>
                  )}

                  {extraFiles.length > 0 && (
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Файли ({extraFiles.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {extraFiles.map((f, i) => (
                          <Badge key={i} variant="secondary" className="bg-muted/40 text-[9px] font-bold h-7 px-3 truncate max-w-[150px] border-border/40">
                            📎 {f.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags & Comments Full Width */}
              {orderTags.length > 0 && (
                <div className="md:col-span-2 space-y-4 pt-4 border-t border-border/40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Теги</p>
                  <div className="flex flex-wrap gap-2">
                    {orderTags.map((tagId) => {
                      const pre = PREDEFINED_TAGS.find((t) => t.id === tagId);
                      return pre ? (
                        <Badge 
                          key={tagId} 
                          className="h-8 px-4 font-black text-[10px] uppercase tracking-wider"
                          style={{ color: pre.color, backgroundColor: `${pre.color}15`, borderColor: `${pre.color}30` }}
                        >
                          {pre.label}
                        </Badge>
                      ) : (
                        <Badge key={tagId} variant="secondary" className="h-8 px-4 font-black text-[10px] uppercase tracking-wider">{tagId}</Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {contact.comment && (
                <div className="md:col-span-2 space-y-3 pt-4 border-t border-border/40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Коментар</p>
                  <div className="p-5 rounded-3xl bg-muted/20 border border-border/30">
                    <p className="text-sm font-medium leading-relaxed italic text-muted-foreground/80">&ldquo;{contact.comment}&rdquo;</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Action */}
          <div className="px-6 md:px-10 pb-10">
            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-[0.2em] text-[10px] gap-3 shadow-sm transition-all hover:shadow-md"
              onClick={onDownloadInvoice} 
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
              {generatingPdf ? "Генеруємо PDF..." : "Завантажити рахунок-фактуру (PDF)"}
            </Button>
          </div>

          {/* Bottom Total Bar */}
          <div className="sticky bottom-4 z-20 mx-3 mb-3 rounded-3xl border border-primary/10 bg-background/90 p-4 shadow-2xl backdrop-blur-xl md:mx-6 md:mb-6 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Загальна сума</p>
              <p className="text-3xl font-black text-primary tracking-tight">₴{(totalCents / 100).toFixed(0)}</p>
            </div>
            
            <div className="flex gap-4 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="lg" 
                className="flex-1 sm:flex-none rounded-full px-8 font-semibold h-12 border-border/60 hover:bg-background/80 transition-all shadow-sm"
                onClick={onBack}
              >
                Редагувати
              </Button>
              <Button 
                size="lg" 
                className="flex-1 sm:flex-none rounded-full px-10 font-semibold h-12 shadow-xl shadow-primary/30 gap-3 group active:scale-[0.98] transition-all"
                onClick={onSubmit} 
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <div className="size-2 rounded-full bg-white group-hover:scale-150 transition-transform shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                )}
                {submitting ? "Створення..." : "Підтвердити замовлення"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
