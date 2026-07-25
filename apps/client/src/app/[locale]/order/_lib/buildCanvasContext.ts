import type { PrintLayer } from "@udo-craft/shared";

export interface CanvasContextInput {
  activeSide: string;
  layers: PrintLayer[];
  selectedColor: string;
  productName: string;
  allSides: string[];
}

export function buildCanvasContext({
  activeSide,
  layers,
  selectedColor,
  productName,
  allSides,
}: CanvasContextInput): string {
  // 1. Group layers by side
  const layersBySide = new Map<string, PrintLayer[]>();
  for (const side of allSides) {
    layersBySide.set(side, []);
  }
  for (const layer of layers) {
    const existing = layersBySide.get(layer.side) ?? [];
    layersBySide.set(layer.side, [...existing, layer]);
  }

  // 2. Compute sides with/without layers
  const sidesWithLayers = allSides.filter((s) => (layersBySide.get(s)?.length ?? 0) > 0);
  const sidesEmpty = allSides.filter((s) => (layersBySide.get(s)?.length ?? 0) === 0);

  // 3. Active side layers sorted by id for determinism
  const activeLayers = [...(layersBySide.get(activeSide) ?? [])].sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  // 4. Build deterministic output string
  const lines: string[] = [
    `Product: ${productName}`,
    `Garment color: ${selectedColor}`,
    `Active side: ${activeSide}`,
    `Sides with prints: ${sidesWithLayers.join(", ") || "none"}`,
    `Empty sides: ${sidesEmpty.join(", ") || "none"}`,
    `Layers on active side (${activeSide}): ${activeLayers.length}`,
  ];

  for (const layer of activeLayers) {
    lines.push(`  - type: ${layer.type}, size: ${layer.sizeLabel ?? "unset"}`);
  }

  // Per-side summaries for other sides with layers (sorted alphabetically)
  const otherSidesWithLayers = sidesWithLayers
    .filter((s) => s !== activeSide)
    .sort((a, b) => a.localeCompare(b));

  for (const side of otherSidesWithLayers) {
    const sideLayers = layersBySide.get(side) ?? [];
    const types = sideLayers.map((l) => l.type).join(", ");
    lines.push(`Layers on ${side}: ${sideLayers.length} (${types})`);
  }

  return lines.join("\n");
}
