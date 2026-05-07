import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import { useState, useRef, type ChangeEvent } from "react";
import {
  useConfig,
  useConfigHydrated,
  ALLERGEN_LABELS,
  type Allergen,
  type Dish,
  type Formula,
  type Tag,
} from "@/lib/config-store";
import { Plus, Trash2, Image as ImageIcon, X, ArrowUp, ArrowDown, Pencil, Check, Leaf, Flame, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/menu")({
  component: () => (
    <AdminGuard>
      <MenuAdmin />
    </AdminGuard>
  ),
  head: () => ({ meta: [{ title: "Carte · Admin" }] }),
});

const ALLERGEN_KEYS = Object.keys(ALLERGEN_LABELS) as Allergen[];

function readImageAsDataUrl(file: File, max = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function MenuAdmin() {
  const hydrated = useConfigHydrated();
  const config = useConfig();
  const [tab, setTab] = useState<"identite" | "categories" | "plats" | "formules">("identite");

  if (!hydrated) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-primary">Configuration</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Ma carte</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">Tout ce que les clients voient en scannant le QR.</p>
          </div>
          <Link
            to="/menu"
            search={{ table: "T1" }}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-[13px] font-medium hover:bg-secondary/80"
          >
            <Eye className="h-3.5 w-3.5" /> Aperçu client
          </Link>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex flex-wrap gap-1.5 border-b border-border">
          {(
            [
              ["identite", "Identité"],
              ["categories", "Catégories"],
              ["plats", "Plats"],
              ["formules", "Formules"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-t-xl px-4 py-2.5 text-[13px] font-medium transition-colors ${
                tab === k ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "identite" && <IdentiteTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "plats" && <DishesTab />}
          {tab === "formules" && <FormulasTab />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Identité ---------------- */

function IdentiteTab() {
  const { restaurantName, logo, setRestaurantName, setLogo } = useConfig();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5_000_000) return toast.error("Image trop lourde (max 5 Mo)");
    const url = await readImageAsDataUrl(f, 400);
    setLogo(url);
    toast.success("Logo mis à jour");
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-3xl bg-surface p-6">
        <h3 className="font-display text-xl font-semibold tracking-tight">Logo</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Affiché sur le menu client.</p>
        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {logo ? (
              <img src={logo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90"
            >
              {logo ? "Remplacer" : "Importer"}
            </button>
            {logo && (
              <button
                onClick={() => {
                  setLogo(undefined);
                  toast.success("Logo retiré");
                }}
                className="text-[12px] text-muted-foreground hover:text-foreground"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-surface p-6">
        <h3 className="font-display text-xl font-semibold tracking-tight">Nom du restaurant</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Visible en tête du menu.</p>
        <input
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          maxLength={60}
          className="mt-5 w-full rounded-2xl bg-card px-4 py-3 text-[15px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
        />
      </div>
    </div>
  );
}

/* ---------------- Catégories ---------------- */

function CategoriesTab() {
  const { categories, addCategory, renameCategory, removeCategory, reorderCategory, dishes } = useConfig();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    addCategory(n);
    setName("");
    toast.success("Catégorie ajoutée");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ex. Boissons, Cocktails, Vins…"
          maxLength={40}
          className="flex-1 rounded-2xl bg-surface px-4 py-3 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
        />
        <button
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-foreground px-5 text-[13px] font-medium text-background hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      <ul className="divide-y divide-border rounded-2xl bg-surface">
        {sorted.map((c, i) => {
          const count = dishes.filter((d) => d.categoryId === c.id).length;
          return (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col">
                <button
                  disabled={i === 0}
                  onClick={() => reorderCategory(c.id, -1)}
                  className="text-muted-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  disabled={i === sorted.length - 1}
                  onClick={() => reorderCategory(c.id, 1)}
                  className="text-muted-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              {editing === c.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => {
                    if (editName.trim()) renameCategory(c.id, editName.trim());
                    setEditing(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="flex-1 rounded-lg bg-card px-3 py-1.5 text-[14px] outline-none ring-1 ring-foreground"
                />
              ) : (
                <button
                  onClick={() => {
                    setEditing(c.id);
                    setEditName(c.name);
                  }}
                  className="flex-1 text-left text-[14px] font-medium"
                >
                  {c.name}
                </button>
              )}
              <span className="text-[12px] text-muted-foreground">{count} plat{count > 1 ? "s" : ""}</span>
              <button
                onClick={() => {
                  setEditing(c.id);
                  setEditName(c.name);
                }}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-card"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Supprimer "${c.name}" et ses ${count} plat(s) ?`)) {
                    removeCategory(c.id);
                    toast.success("Catégorie supprimée");
                  }
                }}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-card hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">Aucune catégorie.</li>
        )}
      </ul>
    </div>
  );
}

/* ---------------- Plats ---------------- */

function DishesTab() {
  const { dishes, categories, removeDish, updateDish } = useConfig();
  const [editing, setEditing] = useState<Dish | "new" | null>(null);

  const sortedCats = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() => setEditing("new")}
          disabled={categories.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nouveau plat
        </button>
      </div>
      {categories.length === 0 && (
        <p className="mt-4 rounded-2xl bg-surface p-6 text-center text-[13px] text-muted-foreground">
          Crée d'abord une catégorie.
        </p>
      )}

      <div className="mt-6 space-y-8">
        {sortedCats.map((cat) => {
          const list = dishes.filter((d) => d.categoryId === cat.id);
          return (
            <div key={cat.id}>
              <h3 className="font-display text-xl font-semibold tracking-tight">{cat.name}</h3>
              <ul className="mt-3 divide-y divide-border rounded-2xl bg-surface">
                {list.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-card ring-1 ring-border">
                      {d.photo ? (
                        <img src={d.photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[14px] font-medium">{d.name}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{d.desc}</p>
                    </div>
                    <span className="text-[14px] font-medium tabular-nums">{d.price}€</span>
                    <button
                      onClick={() => updateDish(d.id, { available: !d.available })}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-card"
                      title={d.available ? "Disponible" : "Épuisé"}
                    >
                      {d.available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-destructive" />}
                    </button>
                    <button
                      onClick={() => setEditing(d)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-card"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer "${d.name}" ?`)) {
                          removeDish(d.id);
                          toast.success("Plat supprimé");
                        }
                      }}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-card hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {list.length === 0 && (
                  <li className="px-4 py-6 text-center text-[12px] text-muted-foreground">Aucun plat.</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {editing && (
        <DishEditor
          dish={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          defaultCategoryId={sortedCats[0]?.id}
        />
      )}
    </div>
  );
}

function DishEditor({
  dish,
  onClose,
  defaultCategoryId,
}: {
  dish: Dish | null;
  onClose: () => void;
  defaultCategoryId?: string;
}) {
  const { categories, addDish, updateDish } = useConfig();
  const [form, setForm] = useState<Omit<Dish, "id">>(
    dish ?? {
      name: "",
      desc: "",
      price: 0,
      categoryId: defaultCategoryId ?? "",
      photo: undefined,
      tags: [],
      allergens: [],
      customAllergens: [],
      available: true,
    },
  );
  const [customInput, setCustomInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5_000_000) return toast.error("Image trop lourde (max 5 Mo)");
    const url = await readImageAsDataUrl(f, 800);
    setForm((p) => ({ ...p, photo: url }));
  };

  const toggle = <K extends "tags" | "allergens">(key: K, value: K extends "tags" ? Tag : Allergen) => {
    setForm((p) => {
      const list = p[key] as string[];
      const next = list.includes(value as string)
        ? list.filter((x) => x !== value)
        : [...list, value];
      return { ...p, [key]: next } as typeof p;
    });
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    if (v.length > 40) return toast.error("Trop long");
    if (form.customAllergens.includes(v)) return;
    setForm((p) => ({ ...p, customAllergens: [...p.customAllergens, v] }));
    setCustomInput("");
  };

  const save = () => {
    if (!form.name.trim()) return toast.error("Nom requis");
    if (!form.categoryId) return toast.error("Catégorie requise");
    if (form.price < 0) return toast.error("Prix invalide");
    if (dish) {
      updateDish(dish.id, form);
      toast.success("Plat mis à jour");
    } else {
      addDish(form);
      toast.success("Plat ajouté");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-card p-6 shadow-pop sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-semibold tracking-tight">
            {dish ? "Modifier le plat" : "Nouveau plat"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Photo */}
        <div className="mt-5">
          <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Photo</label>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
              {form.photo ? (
                <img src={form.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90"
              >
                {form.photo ? "Remplacer" : "Importer"}
              </button>
              {form.photo && (
                <button
                  onClick={() => setForm((p) => ({ ...p, photo: undefined }))}
                  className="text-left text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Pas de photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              maxLength={80}
              className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              value={form.desc}
              onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
              maxLength={200}
              rows={2}
              className="mt-1 w-full resize-none rounded-xl bg-surface px-3 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Prix (€)</label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Catégorie</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-5">
          <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Tags</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["veggie", "spicy"] as Tag[]).map((t) => {
              const on = form.tags.includes(t);
              const Icon = t === "veggie" ? Leaf : Flame;
              return (
                <button
                  key={t}
                  onClick={() => toggle("tags", t)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                    on ? "bg-foreground text-background" : "bg-surface text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-3 w-3" /> {t === "veggie" ? "Veggie" : "Piquant"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Allergens */}
        <div className="mt-5">
          <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Allergènes</label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ALLERGEN_KEYS.map((a) => {
              const on = form.allergens.includes(a);
              return (
                <button
                  key={a}
                  onClick={() => toggle("allergens", a)}
                  className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                    on ? "bg-foreground text-background" : "bg-surface text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {ALLERGEN_LABELS[a]}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground">Autre allergène (texte libre)</p>
            <div className="mt-1.5 flex gap-2">
              <input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
                placeholder="Ex. alcool, fruits exotiques…"
                maxLength={40}
                className="flex-1 rounded-xl bg-surface px-3 py-2 text-[13px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
              />
              <button
                onClick={addCustom}
                className="rounded-xl bg-foreground px-3 text-[12px] font-medium text-background hover:opacity-90"
              >
                Ajouter
              </button>
            </div>
            {form.customAllergens.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.customAllergens.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[12px]"
                  >
                    {a}
                    <button
                      onClick={() =>
                        setForm((p) => ({ ...p, customAllergens: p.customAllergens.filter((x) => x !== a) }))
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Available */}
        <label className="mt-5 flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) => setForm((p) => ({ ...p, available: e.target.checked }))}
            className="h-4 w-4 accent-foreground"
          />
          Disponible à la vente
        </label>

        <button
          onClick={save}
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-foreground py-3.5 text-[14px] font-medium text-background hover:opacity-90"
        >
          <Check className="h-4 w-4" /> Enregistrer
        </button>
      </div>
    </div>
  );
}

/* ---------------- Formules ---------------- */

function FormulasTab() {
  const { formulas, removeFormula, updateFormula } = useConfig();
  const [editing, setEditing] = useState<Formula | "new" | null>(null);

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nouvelle formule
        </button>
      </div>

      <ul className="mt-6 divide-y divide-border rounded-2xl bg-surface">
        {formulas.map((f) => (
          <li key={f.id} className="flex items-center gap-3 px-4 py-4">
            <div className="flex-1 min-w-0">
              <p className="truncate text-[14px] font-medium">{f.name}</p>
              <p className="truncate text-[12px] text-muted-foreground">{f.desc} · {f.dishIds.length} plat(s)</p>
            </div>
            <span className="text-[14px] font-medium tabular-nums">{f.price}€</span>
            <button
              onClick={() => updateFormula(f.id, { available: !f.available })}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-card"
            >
              {f.available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-destructive" />}
            </button>
            <button onClick={() => setEditing(f)} className="rounded-full p-1.5 text-muted-foreground hover:bg-card">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Supprimer "${f.name}" ?`)) {
                  removeFormula(f.id);
                  toast.success("Formule supprimée");
                }
              }}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-card hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {formulas.length === 0 && (
          <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">Aucune formule.</li>
        )}
      </ul>

      {editing && (
        <FormulaEditor formula={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function FormulaEditor({ formula, onClose }: { formula: Formula | null; onClose: () => void }) {
  const { dishes, categories, addFormula, updateFormula } = useConfig();
  const [form, setForm] = useState<Omit<Formula, "id">>(
    formula ?? { name: "", desc: "", price: 0, dishIds: [], available: true },
  );

  const toggleDish = (id: string) =>
    setForm((p) => ({
      ...p,
      dishIds: p.dishIds.includes(id) ? p.dishIds.filter((x) => x !== id) : [...p.dishIds, id],
    }));

  const save = () => {
    if (!form.name.trim()) return toast.error("Nom requis");
    if (formula) updateFormula(formula.id, form);
    else addFormula(form);
    toast.success("Enregistré");
    onClose();
  };

  const sortedCats = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-card p-6 shadow-pop sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-semibold tracking-tight">
            {formula ? "Modifier la formule" : "Nouvelle formule"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              maxLength={80}
              className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Description</label>
            <input
              value={form.desc}
              onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
              maxLength={120}
              className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Prix (€)</label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Plats inclus</label>
          <div className="mt-2 max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-surface p-3">
            {sortedCats.map((c) => {
              const list = dishes.filter((d) => d.categoryId === c.id);
              if (list.length === 0) return null;
              return (
                <div key={c.id}>
                  <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{c.name}</p>
                  <ul className="mt-1">
                    {list.map((d) => (
                      <li key={d.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card">
                          <input
                            type="checkbox"
                            checked={form.dishIds.includes(d.id)}
                            onChange={() => toggleDish(d.id)}
                            className="h-4 w-4 accent-foreground"
                          />
                          <span className="flex-1 text-[13px]">{d.name}</span>
                          <span className="text-[12px] text-muted-foreground">{d.price}€</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <label className="mt-5 flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) => setForm((p) => ({ ...p, available: e.target.checked }))}
            className="h-4 w-4 accent-foreground"
          />
          Disponible
        </label>

        <button
          onClick={save}
          className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-foreground py-3.5 text-[14px] font-medium text-background hover:opacity-90"
        >
          <Check className="h-4 w-4" /> Enregistrer
        </button>
      </div>
    </div>
  );
}
