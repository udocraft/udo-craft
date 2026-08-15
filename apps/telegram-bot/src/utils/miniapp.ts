export function getMiniAppUrl(payload?: Record<string, unknown>): string {
  const baseUrl = process.env.NEXT_PUBLIC_MINI_APP_URL || 'https://t.me/udo_craft_bot/app';
  
  if (!payload) {
    return baseUrl;
  }

  const params = new URLSearchParams();
  if (payload.source) params.set('source', String(payload.source));
  if (payload.lead_id) params.set('lead_id', String(payload.lead_id));
  if (payload.product_id) params.set('product_id', String(payload.product_id));
  if (payload.variant_id) params.set('variant_id', String(payload.variant_id));

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function getStartPayload(ctx: { startPayload?: string }): Record<string, unknown> | null {
  if (!ctx.startPayload) return null;

  try {
    return JSON.parse(ctx.startPayload);
  } catch {
    return { source: ctx.startPayload };
  }
}

export function createStartPayload(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}

export function generateDeepLink(botUsername: string, payload: Record<string, unknown>): string {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(JSON.stringify(payload))}`;
}

export function getWebAppUrl(path: string = '', params?: Record<string, string>): string {
  const baseUrl = process.env.NEXT_PUBLIC_MINI_APP_URL || 'https://t.me/udo_craft_bot/app';
  const url = new URL(baseUrl);
  
  if (path) {
    url.pathname = path.replace(/^\//, '');
  }
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}