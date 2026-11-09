import { describe, it, expect } from "vitest";
import { jsonLdHtml } from "./seo";

describe("jsonLdHtml", () => {
  it("makes </script> in a product name inert", () => {
    const out = jsonLdHtml({ "@type": "Product", name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(out.toLowerCase()).not.toContain("</script");
  });

  it("round-trips through JSON.parse unchanged", () => {
    const data = { name: "</script><b>x</b>", n: 1 };
    expect(JSON.parse(jsonLdHtml(data))).toEqual(data);
  });
});
