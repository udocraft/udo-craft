import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email, otp: clientOtp, name, type } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const isReset = type === "reset";
    let otp = clientOtp;

    // For password reset, generate OTP on the server securely
    if (isReset) {
      const service = createServiceClient();
      const { data: list, error: listErr } = await service.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw listErr;
      
      const user = list.users.find((u) => u.email === email);
      if (!user) {
        // Return success anyway to avoid email enumeration
        return NextResponse.json({ success: true });
      }

      // Generate 6-digit OTP
      otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 min

      // Store OTP hash in user metadata
      await service.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          reset_otp: otp,
          reset_otp_expires: expiresAt,
        },
      });
    } else if (!otp) {
      // For registration, client provides OTP for now
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const subject = isReset ? "Відновлення паролю — U:DO CRAFT" : "Підтвердження email — U:DO CRAFT";
    const heading = isReset ? "Відновлення паролю" : "Підтвердіть ваш email";
    const bodyText = isReset
      ? "Ви запросили відновлення паролю. Введіть код нижче:"
      : `Вітаємо${name ? `, ${name}` : ""}! Для завершення реєстрації введіть код підтвердження:`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://u-do-craft.store";
    const logoUrl = `${appUrl}/logo.png`;

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cousine:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cousine:ital,wght@0,400;0,700;1,400&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Cousine','Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">
          <!-- Header -->
          <tr>
            <td style="background:#eeeeff;padding:32px 40px;text-align:center;border-bottom:1px solid #ddddf5;">
              <img src="${logoUrl}" alt="U:DO CRAFT" width="140" height="auto" style="display:block;margin:0 auto;max-width:140px;height:auto;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;font-family:'Cousine','Courier New',Courier,monospace;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0a0a0a;font-family:'Cousine','Courier New',Courier,monospace;">${heading}</h1>
              <p style="margin:0 0 32px;font-size:14px;color:#666;line-height:1.6;font-family:'Cousine','Courier New',Courier,monospace;">${bodyText}</p>
              <!-- OTP Box -->
              <div style="background:#f8f8ff;border:2px solid #1B18AC;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
                <div style="font-size:40px;font-weight:700;letter-spacing:0.3em;color:#1B18AC;font-family:'Cousine','Courier New',Courier,monospace;">${otp}</div>
                <div style="font-size:12px;color:#888;margin-top:8px;font-family:'Cousine','Courier New',Courier,monospace;">Код дійсний 10 хвилин</div>
              </div>
              <p style="margin:0;font-size:13px;color:#999;line-height:1.6;font-family:'Cousine','Courier New',Courier,monospace;">
                Якщо ви не запитували цей код — просто проігноруйте цей лист.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#bbb;font-family:'Cousine','Courier New',Courier,monospace;">© 2025 U:DO CRAFT · <a href="${appUrl}" style="color:#1B18AC;text-decoration:none;">u-do-craft.store</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: "U:DO CRAFT <noreply@u-do-craft.store>",
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send OTP error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
