import { NextRequest, NextResponse } from "next/server";

// GET /api/telegram/file/:fileId — streams a Telegram-hosted attachment.
// The bot token stays on the server; stored messages only hold the file id.
export async function GET(_request: NextRequest, { params }: { params: { fileId: string } }) {
  const fileId = params.fileId;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !/^[\w-]+$/.test(fileId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const info = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  }).then((res) => res.json() as Promise<{ result?: { file_path?: string } }>);

  const filePath = info.result?.file_path;
  if (!filePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const upstream = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
