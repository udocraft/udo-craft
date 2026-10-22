import { Resend } from "resend";

let resendClient: Resend | null = null;

/** Created on first use so builds and imports work without RESEND_API_KEY. */
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://u-do-craft.store";
const LOGO_URL = `${APP_URL}/logo.png`;
const FROM = "U:DO CRAFT <hi@u-do-craft.store>";
const TEAM_EMAIL = "hi@u-do-craft.store";
const INBOUND_DOMAIN = "poudtio.resend.app";

/** Reply-to address that routes inbound replies to the correct lead thread */
function leadReplyTo(leadId: string): string {
  return `lead-${leadId.slice(0, 8)}@${INBOUND_DOMAIN}`;
}

const FONT = `'Cousine','Courier New',Courier,monospace`;

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Cousine:wght@400;700&display=swap" rel="stylesheet" />
  <style>@import url('https://fonts.googleapis.com/css2?family=Cousine:wght@400;700&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:${FONT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">
        <!-- Header -->
        <tr>
          <td style="background:#eeeeff;padding:28px 40px;text-align:center;border-bottom:1px solid #ddddf5;">
            <img src="${LOGO_URL}" alt="U:DO CRAFT" width="140" height="auto" style="display:block;margin:0 auto;max-width:140px;height:auto;" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;font-family:${FONT};">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#bbb;font-family:${FONT};">
              © 2025 U:DO CRAFT ·
              <a href="${APP_URL}" style="color:#1B18AC;text-decoration:none;">u-do-craft.store</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Order confirmation ───────────────────────────────────────────────────────

export async function sendOrderConfirmation({
  to,
  name,
  leadId,
}: {
  to: string;
  name: string;
  leadId: string;
}) {
  const cabinetUrl = `${APP_URL}/cabinet`;

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0a0a0a;font-family:${FONT};">
      Замовлення прийнято ✓
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7;font-family:${FONT};">
      Привіт, <strong>${name}</strong>! Ваше замовлення успішно отримано.
      Наш менеджер зв'яжеться з вами найближчим часом для уточнення деталей.
    </p>

    <div style="background:#f8f8ff;border-left:4px solid #1B18AC;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#444;font-family:${FONT};">
        <strong>Номер замовлення:</strong><br />
        <span style="font-size:15px;color:#1B18AC;font-weight:700;letter-spacing:0.05em;">${leadId.slice(0, 8).toUpperCase()}</span>
      </p>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.7;font-family:${FONT};">
      Відстежуйте статус замовлення та спілкуйтесь з менеджером у вашому особистому кабінеті.
    </p>

    <a href="${cabinetUrl}"
       style="display:inline-block;background:#1B18AC;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;font-family:${FONT};">
      Відкрити кабінет →
    </a>
  `;

  return getResend().emails.send({
    from: FROM,
    to,
    replyTo: leadReplyTo(leadId),
    subject: "Замовлення прийнято — U:DO CRAFT",
    html: baseTemplate(content),
  });
}

// ─── New message from manager ─────────────────────────────────────────────────

export async function sendNewMessageNotification({
  to,
  name,
  preview,
  leadId,
}: {
  to: string;
  name: string;
  preview: string;
  leadId: string;
}) {
  const cabinetUrl = `${APP_URL}/cabinet`;
  const truncated = preview.length > 120 ? preview.slice(0, 120) + "…" : preview;

  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0a0a0a;font-family:${FONT};">
      Нове повідомлення від менеджера
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7;font-family:${FONT};">
      Привіт, <strong>${name}</strong>! Менеджер U:DO CRAFT надіслав вам повідомлення щодо вашого замовлення.
    </p>

    <div style="background:#f8f8ff;border:1px solid #e0e0f0;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;font-family:${FONT};">Повідомлення</p>
      <p style="margin:0;font-size:14px;color:#333;line-height:1.6;font-family:${FONT};">${truncated}</p>
    </div>

    <a href="${cabinetUrl}"
       style="display:inline-block;background:#1B18AC;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;font-family:${FONT};">
      Відповісти →
    </a>

    <p style="margin:24px 0 0;font-size:12px;color:#aaa;font-family:${FONT};">
      Номер замовлення: ${leadId.slice(0, 8).toUpperCase()}
    </p>
  `;

  return getResend().emails.send({
    from: FROM,
    to,
    replyTo: leadReplyTo(leadId),
    subject: "Нове повідомлення від менеджера — U:DO CRAFT",
    html: baseTemplate(content),
  });
}

// ─── New contact form lead — notify team ─────────────────────────────────────

const TOPIC_LABELS: Record<string, string> = {
  merch:    "Корпоративний мерч",
  popup:    "Popup-стенд на захід",
  box:      "Box of Touch (зразки)",
  designer: "Послуги дизайнера",
  bulk:     "Великий тираж (500+)",
  other:    "Інше",
};

const SOURCE_LABELS: Record<string, string> = {
  contact_form:     "Форма контактів",
  popup_section:    "Секція Popup",
  box_of_touch:     "Box of Touch",
  designer_service: "Послуги дизайнера",
  services_section: "Секція послуг",
  contact_section:  "Секція контактів",
};

export async function sendContactNotification({
  leadId,
  name,
  email,
  phone,
  company,
  topic,
  source,
  message,
}: {
  leadId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  topic?: string;
  source?: string;
  message?: string;
}) {
  const topicLabel  = TOPIC_LABELS[topic ?? ""] ?? topic ?? "—";
  const sourceLabel = SOURCE_LABELS[source ?? ""] ?? source ?? "—";
  const adminUrl    = `https://admin.u-do-craft.store/orders`;

  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 0;font-size:12px;color:#999;font-family:${FONT};width:110px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;font-size:13px;color:#222;font-family:${FONT};font-weight:600;">${value}</td>
    </tr>`;

  const content = `
    <h1 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#0a0a0a;font-family:${FONT};">
      Нова заявка з сайту
    </h1>
    <p style="margin:0 0 24px;font-size:13px;color:#888;font-family:${FONT};">
      ID: <strong style="color:#1B18AC;">${leadId.slice(0, 8).toUpperCase()}</strong>
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;margin-bottom:24px;">
      ${row("Ім'я", name)}
      ${row("Email", email)}
      ${row("Телефон", phone ?? "—")}
      ${row("Компанія", company ?? "—")}
      ${row("Тема", topicLabel)}
      ${row("Джерело", sourceLabel)}
    </table>

    ${message ? `
    <div style="background:#f8f8ff;border-left:3px solid #1B18AC;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;font-family:${FONT};">Повідомлення</p>
      <p style="margin:0;font-size:13px;color:#333;line-height:1.6;font-family:${FONT};">${message.replace(/\n/g, "<br/>")}</p>
    </div>` : ""}

    <a href="${adminUrl}"
       style="display:inline-block;background:#1B18AC;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:700;font-family:${FONT};">
      Відкрити в адмінці →
    </a>
  `;

  return getResend().emails.send({
    from: FROM,
    to: TEAM_EMAIL,
    replyTo: `${email}, lead-${leadId.slice(0, 8)}@${INBOUND_DOMAIN}`,
    subject: `Нова заявка: ${topicLabel} — ${name}`,
    html: baseTemplate(content),
  });
}
