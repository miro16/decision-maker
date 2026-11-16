import { readFileSync } from "node:fs";

// Same literal scan as the UI audit, scoped to the dashboard view this change cleaned.
const files = [
  "src/pages/dashboard.astro",
  "src/components/dashboard/DecisionDashboard.astro",
  "src/pages/dev/dashboard-states.astro",
];

const literal =
  /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|-\[[0-9.]+(px|rem)\]|\b(bg|text|border|ring|outline|from|via|to|fill|stroke|shadow|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/g;

let total = 0;

for (const file of files) {
  const hits = readFileSync(file, "utf8").match(literal)?.length ?? 0;
  total += hits;
  console.log(`${file}: ${hits}`);
}

console.log(`total: ${total}`);

if (total > 0) {
  process.exit(1);
}
