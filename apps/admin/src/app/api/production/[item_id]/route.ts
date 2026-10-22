import { requireAdminPermission } from "@/lib/authz/guard";
import { NextResponse } from "next/server";
import { OrderItem } from "@udo-craft/shared";

export async function GET(request: Request, { params }: { params: { item_id: string } }) {
  const authz = await requireAdminPermission("erp.read");
  if (!authz.ok) return authz.response;
  const itemId = params.item_id;

  // In a real application, we would query Supabase for the specific order item and related product details.
  // const { data: orderItem } = await supabase.from('order_items').select('*').eq('id', itemId).single();

  // Mock Data
  const mockOrderItem: OrderItem = {
    id: itemId,
    lead_id: "lead-1", // mocked
    product_id: "uuid-1", // Classic Hoodie
    size: "L",
    color: "Black",
    quantity: 50,
    custom_print_url: "https://bucket.supabase.com/mockups/raw-logo.png",
    mockup_url: "https://bucket.supabase.com/mockups/hoodie-preview.png",
    technical_metadata: {
      offset_top_mm: 120,
      print_size_mm: [250, 300], // width, height
    }
  };

  const productionPassport = {
    title: "Production Specification Passport",
    item_id: itemId,
    quantity: mockOrderItem.quantity,
    visual_mockup: mockOrderItem.mockup_url,
    print_file: mockOrderItem.custom_print_url,
    instructions: [
      `Align original print file ${mockOrderItem.technical_metadata?.offset_top_mm}mm down from collar.`,
      `Print aspect size: ${mockOrderItem.technical_metadata?.print_size_mm[0]}mm x ${mockOrderItem.technical_metadata?.print_size_mm[1]}mm.`
    ],
    note: "This document is ready for PDF generation (e.g. using @react-pdf/renderer) to be sent to the printing facility."
  };

  return NextResponse.json(productionPassport);
}
