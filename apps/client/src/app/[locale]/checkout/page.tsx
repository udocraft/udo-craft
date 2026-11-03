"use client";

import { useState, useEffect } from "react";
import { lineTotalCents } from "@/lib/order-pricing";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { track, getVisitorId, getSessionId } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, RefreshCw, Package, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";

interface CartItem {
  product: { id: string; name: string; images: Record<string, string>; base_price_cents: number };
  size: string;
  color: string;
  quantity: number;
  mockupDataUrl?: string;
  offsetTopMm?: number;
}

const DELIVERY_OPTION_IDS = ["nova_poshta", "ukrposhta", "pickup"] as const;

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const router = useRouter();
  const supabase = createClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<"cart" | "form" | "success">("cart");
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);

  // Account creation state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [edrpou, setEdrpou] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [socialChannel, setSocialChannel] = useState("");
  const [delivery, setDelivery] = useState("nova_poshta");
  const [deadline, setDeadline] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("udo_cart");
    if (stored) setCart(JSON.parse(stored));
  }, []);

  // Fetch user and prefill form if logged in
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({ email: authUser.email!, id: authUser.id });
        setEmail(authUser.email!);

        // Fetch last order to prefill contact details
        const { data: leads } = await supabase
          .from("leads")
          .select("customer_data")
          .eq("customer_data->>email", authUser.email!)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (leads?.customer_data) {
          const cd = leads.customer_data;
          if (cd.name) setContactName(cd.name);
          if (cd.company) setCompanyName(cd.company);
          if (cd.phone) setPhone(cd.phone);
          if (cd.edrpou) setEdrpou(cd.edrpou);
          if (cd.social_channel) setSocialChannel(cd.social_channel);
          if (cd.delivery) setDelivery(cd.delivery);
        }
      }
    };
    fetchUser();
  }, [supabase]);

  const removeItem = (idx: number) => {
    const updated = cart.filter((_, i) => i !== idx);
    setCart(updated);
    sessionStorage.setItem("udo_cart", JSON.stringify(updated));
  };

  const totalCents = cart.reduce(
    (sum, item) => sum + lineTotalCents(item.product.base_price_cents, item.quantity),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      // 1. Upload mockups before the lead exists; storage keys only need a unique prefix.
      const mockupRef = crypto.randomUUID();
      const mockupUrls = await Promise.all(cart.map(async (item) => {
        if (!item.mockupDataUrl) return undefined;
        const res = await fetch(item.mockupDataUrl);
        const blob = await res.blob();
        const fileName = `mockups/${mockupRef}-${item.product.id}-${Date.now()}.png`;
        const { data: uploadData } = await supabase.storage
          .from("product-images")
          .upload(fileName, blob, { contentType: "image/png" });
        if (!uploadData) return undefined;
        return supabase.storage.from("product-images").getPublicUrl(fileName).data.publicUrl;
      }));

      // 2. Create the lead and its order items on the server (validated, service role).
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "new",
          customer_data: {
            name: contactName,
            email,
            phone,
            company: companyName,
            edrpou,
            social_channel: socialChannel || undefined,
            delivery,
            deadline: deadline || undefined,
            comment: comment || undefined,
          },
          total_amount_cents: Math.round(totalCents),
          visitor_id: getVisitorId(),
          session_id: getSessionId(),
          order_items: cart.map((item, index) => ({
            product_id: item.product.id,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            mockup_url: mockupUrls[index],
            unit_price_cents: item.product.base_price_cents,
            technical_metadata: item.offsetTopMm !== undefined
              ? { offset_top_mm: item.offsetTopMm, print_size_mm: [200, 150] }
              : undefined,
          })),
        }),
      });

      const lead = await response.json();
      if (!response.ok || !lead?.id) {
        throw new Error(lead?.error ?? "Lead creation failed");
      }

      track("form_submit", { form: "checkout", lead_id: lead.id });
      sessionStorage.removeItem("udo_cart");
      setSubmittedEmail(email);
      setStep("success");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setAccountError(t("success.passwordError"));
      return;
    }
    setCreatingAccount(true);
    setAccountError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: submittedEmail,
      password,
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setEmailExists(true);
        setAccountError(null);
      } else {
        setAccountError(t("success.registrationError"));
      }
      setCreatingAccount(false);
      return;
    }

    // Sign in immediately — no email confirmation needed
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: submittedEmail,
      password,
    });

    if (signInError) {
      // signUp worked but email confirmation is required in Supabase settings
      setAccountCreated(true);
    } else {
      router.push("/cabinet");
    }
    setCreatingAccount(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) {
      setAccountError(t("success.enterPasswordError"));
      return;
    }
    setLoggingIn(true);
    setAccountError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: submittedEmail,
      password: loginPassword,
    });

    if (error) {
      setAccountError(t("success.wrongPassword"));
      setLoggingIn(false);
      return;
    }

    router.push("/cabinet");
  };

  if (step === "success") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-100 mb-4">
              <CheckCircle className="size-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t("success.title")}</h1>
            <p className="text-muted-foreground text-sm">
              {t("success.desc")}
            </p>
          </div>

          {!accountCreated ? (
            <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-base">
                  {emailExists ? t("success.loginAccount") : t("success.createAccount")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {emailExists
                    ? t("success.emailExists")
                    : t("success.createAccountDesc")}
                </p>
              </div>

              <form onSubmit={emailExists ? handleLogin : handleCreateAccount} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-email">{t("success.emailLabel")}</Label>
                  <Input
                    id="acc-email"
                    type="email"
                    value={submittedEmail}
                    readOnly
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-password">
                    {emailExists ? t("success.passwordLabel") : t("success.newPasswordLabel")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="acc-password"
                      type={emailExists ? (showLoginPassword ? "text" : "password") : (showPassword ? "text" : "password")}
                      placeholder={emailExists ? t("success.enterPasswordPlaceholder") : t("success.passwordPlaceholder")}
                      value={emailExists ? loginPassword : password}
                      onChange={(e) => emailExists ? setLoginPassword(e.target.value) : setPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => emailExists ? setShowLoginPassword(!showLoginPassword) : setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {(emailExists ? showLoginPassword : showPassword) ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                {accountError && <p className="text-sm text-destructive">{accountError}</p>}
                <Button type="submit" className="w-full" disabled={emailExists ? loggingIn : creatingAccount}>
                  {(emailExists ? loggingIn : creatingAccount) ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  {emailExists
                    ? (loggingIn ? t("success.loggingIn") : t("success.login"))
                    : (creatingAccount ? t("success.creating") : t("success.create"))}
                </Button>
              </form>

              {!emailExists && (
                <div className="text-center">
                  <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {t("success.skip")}
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-border p-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-blue-100 mb-2">
                <CheckCircle className="size-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold">{t("success.accountCreated.title")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("success.accountCreated.desc", { email: submittedEmail })}
                </p>
              </div>
              <Link href="/cabinet/login">
                <Button className="w-full">{t("success.accountCreated.loginBtn")}</Button>
              </Link>
              <Link href="/" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
                {t("success.accountCreated.homeLink")}
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => step === "form" ? setStep("cart") : router.back()}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("backAriaLabel")}
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="text-sm font-medium">
              {step === "cart" ? t("title") : t("orderTitle")}
            </span>
          </div>
          <Link href="/" className="text-[#1B3BFF] font-black text-lg tracking-tight">{t("header")}</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["cart", "form"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm ${step === s ? "font-medium" : "text-muted-foreground"}`}>
                {s === "cart" ? t("stepCart") : t("stepForm")}
              </span>
              {i < 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {step === "cart" && (
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <Package className="size-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">{t("emptyCart")}</p>
                <Link href="/"><Button variant="outline">{t("toCatalog")}</Button></Link>
              </div>
            ) : (
              <>
                {cart.map((item, idx) => {
                  const discount = item.quantity >= 100 ? 0.15 : item.quantity >= 50 ? 0.12 : item.quantity >= 10 ? 0.05 : 0;
                  const itemTotal = item.product.base_price_cents * item.quantity * (1 - discount) / 100;
                  return (
                    <div key={idx} className="bg-white rounded-2xl border border-border p-4 flex gap-4">
                      <div className="size-20 bg-muted rounded-xl overflow-hidden shrink-0">
                        {item.mockupDataUrl ? (
                          <img src={item.mockupDataUrl} alt={t("mockupAlt")} className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.product?.images?.front ?? Object.values(item.product?.images ?? {})[0]} alt={item.product?.name} className="w-full h-full object-contain p-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{item.product.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{item.size}</Badge>
                          <Badge variant="outline" className="text-xs">{item.color}</Badge>
                          <Badge variant="secondary" className="text-xs">×{item.quantity}</Badge>
                        </div>
                        <p className="text-sm font-bold mt-2">{itemTotal.toFixed(0)} {t("currency")}</p>
                        {discount > 0 && <p className="text-xs text-emerald-600">{t("discount", { pct: (discount * 100).toFixed(0) })}</p>}
                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.setItem("udo_cart", JSON.stringify(cart));
                            router.push(`/order?edit=${idx}`);
                          }}
                          className="text-xs text-primary hover:underline mt-2"
                        >
                          {t("edit")}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        aria-label={t("removeItem")}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}

                <div className="bg-white rounded-2xl border border-border p-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t("total")}</span>
                    <span>{(totalCents / 100).toFixed(0)} {t("currency")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t("finalPriceNote")}</p>
                </div>

                <Button className="w-full" size="lg" onClick={() => setStep("form")}>
                  {t("placeOrder")}
                </Button>
              </>
            )}
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
              <h2 className="font-semibold">{t("company.title")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company">{t("company.name")}</Label>
                  <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t("company.namePlaceholder")} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edrpou">{t("company.taxId")}</Label>
                  <Input id="edrpou" value={edrpou} onChange={(e) => setEdrpou(e.target.value)} placeholder={t("company.taxIdPlaceholder")} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
              <h2 className="font-semibold">{t("contact.title")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contact">{t("contact.fullName")}</Label>
                  <Input id="contact" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t("contact.fullNamePlaceholder")} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("contact.email")}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("contact.emailPlaceholder")} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("contact.phone")}</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("contact.phonePlaceholder")} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="social">{t("contact.social")}</Label>
                  <Input id="social" value={socialChannel} onChange={(e) => setSocialChannel(e.target.value)} placeholder={t("contact.socialPlaceholder")} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
              <h2 className="font-semibold">{t("delivery.title")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {DELIVERY_OPTION_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDelivery(id)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      delivery === id ? "border-foreground bg-muted/50" : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <p className="text-sm font-medium">{t(`delivery.options.${id}.label`)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(`delivery.options.${id}.desc`)}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deadline">{t("delivery.deadline")}</Label>
                <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comment">{t("delivery.comment")}</Label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("delivery.commentPlaceholder")}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-white rounded-2xl border border-border p-4">
              <div className="flex justify-between font-bold text-lg">
                <span>{t("total")}</span>
                <span>{(totalCents / 100).toFixed(0)} {t("currency")}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("finalPriceManager")}
              </p>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? <RefreshCw className="size-4 animate-spin mr-2" /> : null}
              {submitting ? t("submitting") : t("submit")}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
