import { describe, expect, it } from "vitest";
import { mapNpResponse, npRequestBody, parseNpQuery } from "./nova-poshta";

const CITY = "db5c88f5-391c-11dd-90d9-001a92567626";

describe("parseNpQuery", () => {
  it("accepts a city search of 2+ chars and rejects shorter", () => {
    expect(parseNpQuery(new URLSearchParams("type=cities&q=Льв"))).toEqual({ type: "cities", q: "Льв" });
    expect(parseNpQuery(new URLSearchParams("type=cities&q=Л"))).toBeNull();
  });
  it("requires a ref-shaped city for warehouses", () => {
    expect(parseNpQuery(new URLSearchParams(`type=warehouses&city=${CITY}`))).toEqual({ type: "warehouses", city: CITY, q: "" });
    expect(parseNpQuery(new URLSearchParams("type=warehouses&city=1;drop"))).toBeNull();
    expect(parseNpQuery(new URLSearchParams("type=other&q=abc"))).toBeNull();
  });
});

describe("mapNpResponse", () => {
  it("maps settlements to the DeliveryCity ref", () => {
    const json = { data: [{ Addresses: [{ Present: "м. Львів, Львівська обл.", DeliveryCity: CITY, Ref: "x" }, { Present: "no ref" }] }] };
    expect(mapNpResponse({ type: "cities", q: "Льв" }, json)).toEqual([{ ref: CITY, label: "м. Львів, Львівська обл." }]);
  });
  it("maps warehouses and survives junk", () => {
    const q = { type: "warehouses", city: CITY, q: "" } as const;
    expect(mapNpResponse(q, { data: [{ Ref: "w1", Description: "Відділення №1" }] })).toEqual([{ ref: "w1", label: "Відділення №1" }]);
    expect(mapNpResponse(q, { success: false })).toEqual([]);
    expect(mapNpResponse(q, null)).toEqual([]);
  });
});

describe("npRequestBody", () => {
  it("builds the right method per type", () => {
    expect(npRequestBody({ type: "cities", q: "Київ" }, "k").calledMethod).toBe("searchSettlements");
    expect(npRequestBody({ type: "warehouses", city: CITY, q: "5" }, "").methodProperties).toMatchObject({ CityRef: CITY, FindByString: "5" });
  });
});
