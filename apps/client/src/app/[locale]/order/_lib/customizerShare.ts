import type { PrintLayer } from "@udo-craft/shared";

export type ShareAccess = "view" | "comment" | "edit";

export interface SerializedShareLayer {
  id: string;
  uploadedUrl: string;
  type: PrintLayer["type"];
  side: string;
  kind?: PrintLayer["kind"];
  sizeLabel?: string;
  sizeMinCm?: number;
  sizeMaxCm?: number;
  priceCents?: number;
  transform?: PrintLayer["transform"];
  textContent?: string;
  textFont?: PrintLayer["textFont"];
  textColor?: string;
  textFontSize?: number;
  textAlign?: PrintLayer["textAlign"];
  textCurve?: number;
  textTransform?: PrintLayer["textTransform"];
  textLetterSpacing?: number;
  textLineHeight?: number;
  textBold?: boolean;
  textItalic?: boolean;
  textOverflow?: PrintLayer["textOverflow"];
  textBackgroundColor?: string;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  textBoxWidth?: number;
  textBoxHeight?: number;
  svgFillColor?: string;
  svgStrokeColor?: string;
}

export interface CustomizerSharePayload {
  version: 1;
  productId: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  itemNote: string;
  activeSide: string;
  layers: SerializedShareLayer[];
  savedAt: number;
}

export interface CustomizerShareComment {
  id: string;
  body: string;
  author_email?: string | null;
  created_at: string;
}

export interface LoadedCustomizerShare {
  token: string;
  productId: string;
  access: ShareAccess;
  ownerEmail?: string | null;
  payload: CustomizerSharePayload;
  comments: CustomizerShareComment[];
}

export function serializeShareLayer(layer: PrintLayer): SerializedShareLayer | null {
  const isText = layer.kind === "text";
  const hasUploadedUrl = !!layer.uploadedUrl;
  if (!isText && !hasUploadedUrl) return null;

  return {
    id: layer.id,
    uploadedUrl: layer.uploadedUrl ?? "",
    type: layer.type,
    side: layer.side,
    kind: layer.kind,
    sizeLabel: layer.sizeLabel,
    sizeMinCm: layer.sizeMinCm,
    sizeMaxCm: layer.sizeMaxCm,
    priceCents: layer.priceCents,
    transform: layer.transform,
    textContent: layer.textContent,
    textFont: layer.textFont,
    textColor: layer.textColor,
    textFontSize: layer.textFontSize,
    textAlign: layer.textAlign,
    textCurve: layer.textCurve,
    textTransform: layer.textTransform,
    textLetterSpacing: layer.textLetterSpacing,
    textLineHeight: layer.textLineHeight,
    textBold: layer.textBold,
    textItalic: layer.textItalic,
    textOverflow: layer.textOverflow,
    textBackgroundColor: layer.textBackgroundColor,
    textStrokeColor: layer.textStrokeColor,
    textStrokeWidth: layer.textStrokeWidth,
    textBoxWidth: layer.textBoxWidth,
    textBoxHeight: layer.textBoxHeight,
    svgFillColor: layer.svgFillColor,
    svgStrokeColor: layer.svgStrokeColor,
  };
}

export function deserializeShareLayer(layer: SerializedShareLayer): PrintLayer {
  const isText = layer.kind === "text";
  const file = new File([], isText ? "text-layer.txt" : "shared-image.png", {
    type: isText ? "text/plain" : "image/png",
  });

  return {
    ...layer,
    file,
    url: layer.uploadedUrl,
    uploadedUrl: layer.uploadedUrl || undefined,
  };
}

export function buildSharePayload(input: {
  productId: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  itemNote: string;
  activeSide: string;
  layers: PrintLayer[];
}): CustomizerSharePayload {
  return {
    version: 1,
    productId: input.productId,
    selectedColor: input.selectedColor,
    selectedSize: input.selectedSize,
    quantity: input.quantity,
    itemNote: input.itemNote,
    activeSide: input.activeSide,
    layers: input.layers.map(serializeShareLayer).filter((layer): layer is SerializedShareLayer => Boolean(layer)),
    savedAt: Date.now(),
  };
}

export function hydrateSharePayload(payload: CustomizerSharePayload) {
  return {
    selectedColor: payload.selectedColor,
    selectedSize: payload.selectedSize,
    quantity: payload.quantity,
    itemNote: payload.itemNote,
    activeSide: payload.activeSide,
    layers: payload.layers.map(deserializeShareLayer),
  };
}
