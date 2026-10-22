import { Resend } from "resend";

let resendClient: Resend | null = null;

/** Created on first use so builds and imports work without RESEND_API_KEY. */
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

const APP_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? "https://u-do-craft.store";
const LOGO_URL = `${APP_URL}/logo.png`;
const FROM = "U:DO CRAFT <noreply@u-do-craft.store>";
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
        <tr>
          <td style="background:#eeeeff;padding:28px 40px;text-align:center;border-bottom:1px solid #ddddf5;">
            <img src="${LOGO_URL}" alt="U:DO CRAFT" width="140" height="auto" style="display:block;margin:0 auto;max-width:140px;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 28px;font-family:${FONT};">
            ${content}
          </td>
        </tr>
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
    subject: "Нове повідомлення від менеджера — U:DO CRAFT",
    html: baseTemplate(content),
  });
}
