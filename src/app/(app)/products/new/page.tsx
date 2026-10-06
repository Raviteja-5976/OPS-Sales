import { PageHeader } from "@/components/ui";
import { NewProductForm } from "./form";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  return (
    <div className="max-w-3xl">
      <PageHeader
        title={welcome ? "Welcome — let's add your first product" : "Add a product"}
        subtitle="Company & offer intake. Answer what you can; the AI will interview you about gaps before drafting your Sales Foundation. Every claim it drafts is labelled by source."
        back={welcome ? undefined : { href: "/products", label: "Products" }}
      />
      <NewProductForm />
    </div>
  );
}
