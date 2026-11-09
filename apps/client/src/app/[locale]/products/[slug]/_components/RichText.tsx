function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

/** Paragraphs and "- bullet" lines from admin-authored plain text. Server component. */
export function RichText({ text }: { text: string }) {
  const all = lines(text);
  const bullets = all.filter((line) => /^[-•]\s+/.test(line));
  const paragraphs = all.filter((line) => !/^[-•]\s+/.test(line));

  return (
    <div className="space-y-5 text-lede text-foreground/90">
      {paragraphs.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {bullets.length > 0 && (
        <ul className="list-disc space-y-2 pl-7">
          {bullets.map((line) => (
            <li key={line}>{line.replace(/^[-•]\s+/, "")}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
