import { getContext } from "@/lib/context";
import { loadProducts } from "@/lib/loaders";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const products = await loadProducts(ctx);
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        orgName={ctx.org.name}
        userName={ctx.displayName}
        role={ctx.role}
        products={products.map((p) => ({ id: p.id, name: p.name, status: p.status }))}
      />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </main>
      <CommandPalette />
    </div>
  );
}
