import { redirect } from "next/navigation";

// The product list lives in the catalog; /products kept a second copy of the
// same tabs. Product create/edit pages stay under /products/*.
export default function ProductsPage() {
  redirect("/catalog?tab=products");
}
