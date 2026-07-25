"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirects old /customize/[productId] links to the unified /order flow
export default function CustomizeRedirect({ params }: { params: { productId: string } }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/order?product=${params.productId}`);
  }, [params.productId, router]);
  return null;
}
