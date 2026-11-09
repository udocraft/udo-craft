import { describe, it, expect } from "vitest";
import { sanitizeCmsHtml } from "./sanitize-cms-html";

describe("sanitizeCmsHtml", () => {
  it("removes <script> including its body", () => {
    const out = sanitizeCmsHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).toBe("<p>ok</p>");
  });

  it("strips event-handler attributes", () => {
    const out = sanitizeCmsHtml('<p onclick="x()">a</p><img src=x onerror="alert(1)">');
    expect(out).toBe("<p>a</p>");
    expect(out).not.toMatch(/onerror|onclick/i);
  });

  it("drops javascript:, data: and vbscript: hrefs", () => {
    for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,<b>x</b>", "vbscript:x"]) {
      const out = sanitizeCmsHtml(`<a href="${href}">x</a>`);
      expect(out).not.toMatch(/javascript|data:|vbscript/i);
    }
  });

  it("keeps http, https and mailto links", () => {
    const out = sanitizeCmsHtml(
      '<a href="https://u-do-craft.store/x">a</a><a href="http://a.test">b</a><a href="mailto:hi@a.test">c</a>',
    );
    expect(out).toContain('href="https://u-do-craft.store/x"');
    expect(out).toContain('href="http://a.test"');
    expect(out).toContain('href="mailto:hi@a.test"');
  });

  it("removes style, iframe and attributes other than href", () => {
    const out = sanitizeCmsHtml('<p style="x" class="y">a</p><iframe src="https://e.test"></iframe><style>p{}</style>');
    expect(out).toBe("<p>a</p>");
  });

  it("keeps the allowlisted structure", () => {
    const html = "<h2>T</h2><h3>S</h3><h4>S</h4><p>a<br />b <strong>c</strong> <em>d</em></p><ul><li>x</li></ul><ol><li>y</li></ol>";
    expect(sanitizeCmsHtml(html)).toBe(html);
  });

  it("drops h1 and other disallowed tags but keeps their text", () => {
    expect(sanitizeCmsHtml("<h1>Big</h1><div>text</div>")).toBe("Bigtext");
  });
});
