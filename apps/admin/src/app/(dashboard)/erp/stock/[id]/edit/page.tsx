"use client";

import { use } from "react";
import { StockForm } from "../../_components/StockForm";

export default function EditStockItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StockForm id={id} />;
}
