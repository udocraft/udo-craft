const fs = require("fs");
const path = require("path");

const messagesDir = path.join(__dirname, "..", "messages");

const locales = fs.readdirSync(messagesDir).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));

for (const locale of locales) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const localeDir = path.join(messagesDir, locale);
  fs.mkdirSync(localeDir, { recursive: true });

  for (const [namespace, data] of Object.entries(content)) {
    fs.writeFileSync(
      path.join(localeDir, `${namespace}.json`),
      JSON.stringify(data, null, 2) + "\n"
    );
  }

  console.log(`Split ${locale}.json into ${Object.keys(content).length} namespace files`);
}
