import { createFileRoute } from "@tanstack/react-router";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { useOrders, timeAgo } from "@/lib/use-orders";
import { useMounted } from "@/lib/use-mounted";
import { useServerFn } from "@tanstack/react-start";
import { generateReceiptPdfFn } from "@/lib/receipt.functions";
import { nextReceiptNumberFn } from "@/lib/settings.functions";
import { markPaidFn, setOrderEmailFn } from "@/lib/orders.functions";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Mail, Search } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: () => (
    <AdminGuard>
      <OrdersHistory />
    </AdminGuard>
  ),
  head: () => ({ meta: [{ title: "Historique" }] }),
});

function OrdersHistory() {
  const mounted = useMounted();
  const { data: allOrders } = useOrders();
  const archived = allOrders.filter((o) => o.status === "served");
  const setEmailFn = useServerFn(setOrderEmailFn);
  const payFn = useServerFn(markPaidFn);
  const genPdf = useServerFn(generateReceiptPdfFn);
  const nextRcpt = useServerFn(nextReceiptNumberFn);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [emailDraft, setEmailDraft] = useState<Record<string, string>>({});

  const list = [...archived]
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((o) => {
      if (!filter.trim()) return true;
      const q = filter.toLowerCase();
      return (
        o.id.includes(q) ||
        o.table.toLowerCase().includes(q) ||
        (o.receiptNumber ?? "").toLowerCase().includes(q) ||
        (o.customerEmail ?? "").toLowerCase().includes(q)
      );
    });

  const ensureReceipt = async (orderId: string, current?: string | null) => {
    if (current) return current;
    const { number } = await nextRcpt();
    await payFn({ data: { id: orderId, receiptNumber: number } });
    qc.invalidateQueries({ queryKey: ["orders"] });
    return number;
  };

  const handleDownload = async (orderId: string) => {
    const order = archived.find((o) => o.id === orderId);
    if (!order) return;
    setBusy(orderId);
    try {
      const receiptNumber = await ensureReceipt(orderId, order.receiptNumber);
      const { base64, filename } = await genPdf({
        data: {
          table: order.table,
          receiptNumber,
          createdAt: order.createdAt,
          paidAt: order.paidAt ?? undefined,
          paymentMethod: order.paymentMethod ?? undefined,
          items: order.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        },
      });
      const blob = await (await fetch(`data:application/pdf;base64,${base64}`)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Note téléchargée");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = async (orderId: string) => {
    const order = archived.find((o) => o.id === orderId);
    if (!order) return;
    const email = (emailDraft[orderId] ?? order.customerEmail ?? "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email invalide");
      return;
    }
    await setEmailFn({ data: { id: orderId, email } });
    qc.invalidateQueries({ queryKey: ["orders"] });
    toast("Email enregistré", {
      description: "La note a été enregistrée pour cet email — téléchargez-la en attendant.",
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-primary">Historique</p>
        <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">Notes & encaissements</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Téléchargez la note PDF ou envoyez-la par email au client.
        </p>

        <div className="mt-8 flex items-center gap-2 rounded-2xl bg-surface px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Rechercher par table, n° commande, email…"
            className="flex-1 bg-transparent text-[14px] outline-none"
          />
        </div>

        <div className="mt-6 space-y-3">
          {list.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-10 text-center text-[13px] text-muted-foreground">
              Aucune commande servie pour l'instant.
            </div>
          )}
          {list.map((o) => (
            <article key={o.id} className="rounded-3xl bg-surface p-5">
              <header className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-semibold tracking-tight">
                    {o.table} · #{o.receiptNumber ?? o.id.split('-')[0]}
                    {o.receiptNumber && (
                      <span className="ml-2 rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Note {o.receiptNumber}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {timeAgo(o.createdAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} articles
                    {o.paid ? " · payée" : " · non encaissée"}
                  </p>
                </div>
                <span className="font-display text-2xl font-semibold tabular-nums">{o.total}€</span>
              </header>

              <ul className="mt-3 space-y-1 text-[13px]">
                {o.items.map((it, i) => (
                  <li key={i} className="flex justify-between text-muted-foreground">
                    <span>
                      <span className="tabular-nums">{it.qty}× </span>
                      {it.name}
                    </span>
                    <span className="tabular-nums">{it.qty * it.price}€</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  type="email"
                  defaultValue={o.customerEmail ?? ""}
                  onChange={(e) => setEmailDraft({ ...emailDraft, [o.id]: e.target.value })}
                  placeholder="email@client.com"
                  className="flex-1 min-w-[200px] rounded-xl bg-card px-3 py-2 text-[13px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
                />
                <button
                  onClick={() => handleEmail(o.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-[12px] font-medium ring-1 ring-border hover:bg-foreground hover:text-background"
                >
                  <Mail className="h-3.5 w-3.5" /> Envoyer
                </button>
                <button
                  onClick={() => handleDownload(o.id)}
                  disabled={busy === o.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-[12px] font-medium text-background hover:opacity-90 disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  {busy === o.id ? "…" : "Note PDF"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
