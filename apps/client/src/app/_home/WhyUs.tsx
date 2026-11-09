import { getTranslations } from "next-intl/server";
import { Check, Minus, X } from "lucide-react";
import { Section, SectionHeader } from "@udo-craft/ui";
import { cmsText, cmsValue, type HomeCtx } from "./context";

type Cell = "check" | "cross" | "partial" | `values.${string}`;

const FEATURES = ["minOrder", "editor", "samples", "manager", "fixedPrice", "timeline", "quality", "popup", "design", "logistics"] as const;

// Columns: typical supplier, U:DO Craft, print shop. One value per FEATURES row.
const COLUMNS: { key: "typical" | "udo" | "printer"; cells: Cell[] }[] = [
  { key: "typical", cells: ["values.min500", "cross", "cross", "cross", "cross", "values.days30", "partial", "cross", "partial", "cross"] },
  { key: "udo", cells: ["values.minFrom10", "check", "check", "check", "check", "values.days7to14", "check", "check", "check", "check"] },
  { key: "printer", cells: ["values.min100", "cross", "partial", "cross", "partial", "values.days14to21", "partial", "cross", "partial", "cross"] },
];

interface Guarantee { title: string; body: string }

export async function WhyUs({ ctx }: { ctx: HomeCtx }) {
  const { locale } = ctx;
  const [t, tTrust, tStats] = await Promise.all([
    getTranslations({ locale, namespace: "comparison" }),
    getTranslations({ locale, namespace: "trust" }),
    getTranslations({ locale, namespace: "homeStats" }),
  ]);

  const stats = [1, 2, 3, 4].map((n) => ({
    value: cmsValue(ctx, "home_stats", `stat${n}_value`, ["500", "15", "14", "100"][n - 1]),
    suffix:
      n === 3
        ? cmsText(ctx, "home_stats", "stat3_suffix", tStats("stat3Suffix"))
        : cmsValue(ctx, "home_stats", `stat${n}_suffix`, ["+", "%", "", "%"][n - 1]),
    label: cmsText(ctx, "home_stats", `stat${n}_label`, tStats(`stat${n}Label` as "stat1Label")),
  }));

  const trustCms = ctx.cms.home_trust ?? {};
  const guarantees: Guarantee[] = Array.isArray(trustCms.guarantees)
    ? (trustCms.guarantees as Guarantee[])
    : [0, 1, 2, 3].map((i) => ({ title: tTrust(`guarantees.${i}.title`), body: tTrust(`guarantees.${i}.body`) }));
  const trustHeading = (typeof trustCms.heading === "string" && trustCms.heading) || tTrust("heading");
  const trustSubtext = (typeof trustCms.subtext === "string" && trustCms.subtext) || tTrust("subtext");

  const icon = (kind: "check" | "cross" | "partial") => {
    if (kind === "check") return { Icon: Check, cls: "text-success", label: t("yes") };
    if (kind === "cross") return { Icon: X, cls: "text-destructive", label: t("no") };
    return { Icon: Minus, cls: "text-muted-foreground", label: t("partial") };
  };

  return (
    <Section id="about" aria-labelledby="why-heading">
      <SectionHeader titleId="why-heading" title={t("heading")} lede={t("subtext")} />

      <dl className="grid grid-cols-2 border-y border-border md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="border-border px-4 py-8 odd:border-r md:border-r md:last:border-r-0">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="text-h1 font-semibold tabular-nums">
              {s.value}
              {s.suffix}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 overflow-x-auto rounded-card border border-border" role="region" aria-label={t("heading")} tabIndex={0}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{t("heading")}</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-[38%] p-3 font-medium text-muted-foreground sm:p-4">
                {t("featureLabel")}
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`p-3 text-center font-semibold sm:p-4 ${c.key === "udo" ? "bg-accent text-foreground" : "text-muted-foreground"}`}
                >
                  {t(`columns.${c.key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f, row) => (
              <tr key={f} className="border-b border-border last:border-b-0">
                <th scope="row" className="p-3 font-medium sm:p-4">
                  {t(`features.${f}.name`)}
                  <span className="mt-0.5 hidden text-xs font-normal text-muted-foreground md:block">{t(`features.${f}.desc`)}</span>
                </th>
                {COLUMNS.map((c) => {
                  const cell = c.cells[row];
                  const highlight = c.key === "udo" ? "bg-accent" : "";
                  if (cell.startsWith("values.")) {
                    return (
                      <td key={c.key} className={`p-3 text-center font-medium sm:p-4 ${highlight}`}>
                        {t(cell as "values.min500")}
                      </td>
                    );
                  }
                  const { Icon, cls, label } = icon(cell as "check" | "cross" | "partial");
                  return (
                    <td key={c.key} className={`p-3 text-center sm:p-4 ${highlight}`}>
                      <Icon className={`mx-auto size-5 ${cls}`} strokeWidth={2.5} aria-hidden="true" />
                      <span className="sr-only">{label}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-16">
        <h3 className="text-h3 font-semibold">{trustHeading}</h3>
        <p className="mt-2 max-w-xl text-muted-foreground">{trustSubtext}</p>
        <ul className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {guarantees.map((g, i) => (
            <li key={`${g.title}-${i}`} className="border-t border-border pt-5">
              <h4 className="text-h4 font-semibold">{g.title}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{g.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
