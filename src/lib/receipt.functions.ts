import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "./auth.functions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";

const itemSchema = z.object({
  name: z.string().max(200),
  qty: z.number().int().min(1).max(999),
  price: z.number().min(0).max(100000),
});

const buildSchema = z.object({
  table: z.string().max(40),
  receiptNumber: z.string().max(40),
  createdAt: z.number().int(),
  paidAt: z.number().int().optional(),
  paymentMethod: z.enum(["cash", "card", "other"]).optional(),
  items: z.array(itemSchema).min(1).max(200),
});

function fmt(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function dateFR(ts: number) {
  return new Date(ts).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Espèces",
  card: "Carte bancaire",
  other: "Autre",
};

export const generateReceiptPdfFn = createServerFn({ method: "POST" })
  .inputValidator((input) => buildSchema.parse(input))
  .handler(async ({ data }): Promise<{ base64: string; filename: string }> => {
    const me = await requireUser();
    if (!me.tenantId) throw new Error("Aucun restaurant associé");

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("name, address, siret, tva_number, tva_rate, phone, email, receipt_footer")
      .eq("id", me.tenantId)
      .single();
    if (error || !tenant) throw new Error("Restaurant introuvable");

    const tvaRate = Number(tenant.tva_rate ?? 10);
    const totalTTC = data.items.reduce((s, it) => s + it.price * it.qty, 0);
    const totalHT = totalTTC / (1 + tvaRate / 100);
    const tvaAmount = totalTTC - totalHT;

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([420, 700]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.size();
    let y = height - 40;

    const draw = (text: string, opts: { x?: number; size?: number; b?: boolean; color?: [number, number, number] } = {}) => {
      const f = opts.b ? bold : font;
      const size = opts.size ?? 10;
      const col = opts.color ?? [0.1, 0.1, 0.1];
      page.drawText(text, { x: opts.x ?? 30, y, size, font: f, color: rgb(col[0], col[1], col[2]) });
    };

    // Header
    draw(tenant.name ?? "Restaurant", { size: 18, b: true });
    y -= 20;
    if (tenant.address) {
      for (const line of String(tenant.address).split(/\r?\n/).slice(0, 4)) {
        draw(line, { size: 9, color: [0.35, 0.35, 0.35] });
        y -= 12;
      }
    }
    if (tenant.phone) {
      draw(`Tél : ${tenant.phone}`, { size: 9, color: [0.35, 0.35, 0.35] });
      y -= 12;
    }
    if (tenant.email) {
      draw(`${tenant.email}`, { size: 9, color: [0.35, 0.35, 0.35] });
      y -= 12;
    }
    if (tenant.siret) {
      draw(`SIRET : ${tenant.siret}`, { size: 9, color: [0.35, 0.35, 0.35] });
      y -= 12;
    }
    if (tenant.tva_number) {
      draw(`N° TVA : ${tenant.tva_number}`, { size: 9, color: [0.35, 0.35, 0.35] });
      y -= 12;
    }

    y -= 10;
    page.drawLine({ start: { x: 30, y }, end: { x: width - 30, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 18;

    draw(`Note n° ${data.receiptNumber}`, { b: true, size: 12 });
    y -= 14;
    draw(`Date : ${dateFR(data.paidAt ?? data.createdAt)}`, { size: 9 });
    y -= 12;
    draw(`Table : ${data.table}`, { size: 9 });
    y -= 20;

    // Items header
    draw("Désignation", { b: true, size: 10 });
    page.drawText("Qté", { x: 250, y, size: 10, font: bold });
    page.drawText("PU", { x: 300, y, size: 10, font: bold });
    page.drawText("Total", { x: width - 70, y, size: 10, font: bold });
    y -= 6;
    page.drawLine({ start: { x: 30, y }, end: { x: width - 30, y }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });
    y -= 12;

    for (const it of data.items) {
      const line = it.name.length > 40 ? it.name.slice(0, 38) + "…" : it.name;
      draw(line, { size: 10 });
      page.drawText(String(it.qty), { x: 255, y, size: 10, font });
      page.drawText(`${fmt(it.price)} €`, { x: 295, y, size: 10, font });
      const lt = `${fmt(it.price * it.qty)} €`;
      page.drawText(lt, { x: width - 30 - bold.widthOfTextAtSize(lt, 10), y, size: 10, font: bold });
      y -= 14;
      if (y < 140) break;
    }

    y -= 8;
    page.drawLine({ start: { x: 30, y }, end: { x: width - 30, y }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });
    y -= 16;

    const rightLabel = (label: string, value: string, b = false) => {
      const f = b ? bold : font;
      const sz = b ? 12 : 10;
      page.drawText(label, { x: width - 200, y, size: sz, font: f });
      const w = f.widthOfTextAtSize(value, sz);
      page.drawText(value, { x: width - 30 - w, y, size: sz, font: f });
      y -= b ? 18 : 14;
    };

    rightLabel("Total HT", `${fmt(totalHT)} €`);
    rightLabel(`TVA (${tvaRate}%)`, `${fmt(tvaAmount)} €`);
    rightLabel("Total TTC", `${fmt(totalTTC)} €`, true);

    if (data.paymentMethod) {
      y -= 4;
      draw(`Paiement : ${PAYMENT_LABEL[data.paymentMethod]}`, { size: 10 });
      y -= 14;
    }

    if (tenant.receipt_footer) {
      y -= 16;
      draw(tenant.receipt_footer, { size: 9, color: [0.4, 0.4, 0.4] });
      y -= 12;
    }

    y = 40;
    draw("Merci de votre visite", { x: 30, size: 9, color: [0.5, 0.5, 0.5] });

    const bytes = await pdf.save();
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    return { base64, filename: `note-${data.receiptNumber}.pdf` };
  });
