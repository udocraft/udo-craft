/** Nova Poshta address lookup (public API v2.0). Server-only callers: /api/nova-poshta. */
export interface NpOption {
  /** City: DeliveryCity ref (what getWarehouses expects). Branch: warehouse ref. */
  ref: string;
  label: string;
}

const REF = /^[0-9a-f-]{36}$/i;

export type NpQuery =
  | { type: "cities"; q: string }
  | { type: "warehouses"; city: string; q: string };

/** Validate query params. Returns null when the request is malformed. */
export function parseNpQuery(params: URLSearchParams): NpQuery | null {
  const q = (params.get("q") ?? "").trim().slice(0, 60);
  const type = params.get("type");
  if (type === "cities") return q.length >= 2 ? { type, q } : null;
  if (type === "warehouses") {
    const city = params.get("city") ?? "";
    return REF.test(city) ? { type, city, q } : null;
  }
  return null;
}

export function npRequestBody(query: NpQuery, apiKey: string) {
  return query.type === "cities"
    ? { apiKey, modelName: "AddressGeneral", calledMethod: "searchSettlements", methodProperties: { CityName: query.q, Limit: "20" } }
    : { apiKey, modelName: "AddressGeneral", calledMethod: "getWarehouses", methodProperties: { CityRef: query.city, FindByString: query.q, Limit: "50" } };
}

type Row = Record<string, unknown>;
const text = (v: unknown) => (typeof v === "string" ? v : "");

/** Map the API payload to {ref,label}. Unknown shapes become an empty list, never a throw. */
export function mapNpResponse(query: NpQuery, json: unknown): NpOption[] {
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];
  const rows: Row[] = query.type === "cities" ? ((data[0] as { Addresses?: Row[] })?.Addresses ?? []) : (data as Row[]);
  return rows
    .map((r) =>
      query.type === "cities"
        ? { ref: text(r.DeliveryCity), label: text(r.Present) }
        : { ref: text(r.Ref), label: text(r.Description) },
    )
    .filter((o) => o.ref && o.label);
}
