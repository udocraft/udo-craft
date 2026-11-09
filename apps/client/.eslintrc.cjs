/**
 * Design-token lint (Plan.md section 2.1 / 2.2): arbitrary text sizes and
 * arbitrary hex backgrounds bypass the type scale and the colour tokens.
 *   text-[11px]  -> text-xs / text-eyebrow / text-h3 ...
 *   bg-[#0d1020] -> bg-ink, bg-primary, bg-background ...
 * Canvas/editor colours are data, not tokens: keep them in a constants file.
 */
const ARBITRARY_CLASS = "(^|[\\s:!\"'`])(text-\\[|bg-\\[#)";

const tokenMessage =
  "Arbitrary text-[...] / bg-[#...] classes are blocked. Use the type scale (text-xs, text-sm, text-h1...) and colour tokens (bg-primary, bg-ink...). See apps/client/src/app/globals.css.";

const noArbitraryTokens = [
  {
    selector: `Literal[value=/${ARBITRARY_CLASS}/]`,
    message: tokenMessage,
  },
  {
    selector: `TemplateElement[value.raw=/${ARBITRARY_CLASS}/]`,
    message: tokenMessage,
  },
];

module.exports = {
  extends: ["next/core-web-vitals", "next/typescript"],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "react/no-unescaped-entities": "warn",
    "no-restricted-syntax": ["error", ...noArbitraryTokens],
  },
  overrides: [
    {
      // Legacy debt, downgraded to warnings. Phase 3 (colour clean-up) removes
      // each file from this list. Do NOT add files here.
      files: [
        "src/app/[[]locale]/order/_components/editor/DrawingModal.tsx",
        "src/app/_sections/FooterSection.tsx",
        "src/components/ContactForm.tsx",
      ],
      rules: {
        "no-restricted-syntax": ["warn", ...noArbitraryTokens],
      },
    },
  ],
};
