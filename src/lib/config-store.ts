import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";

export type Allergen =
  | "gluten"
  | "lactose"
  | "oeuf"
  | "fruits-coque"
  | "arachide"
  | "soja"
  | "poisson"
  | "crustaces"
  | "mollusques"
  | "celeri"
  | "moutarde"
  | "sesame"
  | "sulfites"
  | "lupin";

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: "Gluten",
  lactose: "Lactose",
  oeuf: "Œuf",
  "fruits-coque": "Fruits à coque",
  arachide: "Arachide",
  soja: "Soja",
  poisson: "Poisson",
  crustaces: "Crustacés",
  mollusques: "Mollusques",
  celeri: "Céleri",
  moutarde: "Moutarde",
  sesame: "Sésame",
  sulfites: "Sulfites",
  lupin: "Lupin",
};

export type Tag = "veggie" | "spicy";

export type Dish = {
  id: string;
  name: string;
  desc: string;
  price: number;
  categoryId: string;
  photo?: string; // dataURL or http URL, undefined = no photo
  tags: Tag[];
  allergens: Allergen[];
  customAllergens: string[]; // free-text allergens
  available: boolean;
};

export type Category = {
  id: string;
  name: string;
  order: number;
};

export type Schedule = {
  // 0 = Sunday ... 6 = Saturday
  days: number[];
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
};

export type Formula = {
  id: string;
  name: string;
  desc: string;
  price: number;
  dishIds: string[]; // included dishes
  available: boolean;
  // If empty/undefined => available all the time
  schedules?: Schedule[];
};

type ConfigState = {
  restaurantName: string;
  logo?: string; // dataURL
  timezone: string; // IANA tz, e.g. "Europe/Paris"
  categories: Category[];
  dishes: Dish[];
  formulas: Formula[];

  setRestaurantName: (n: string) => void;
  setLogo: (logo?: string) => void;
  setTimezone: (tz: string) => void;

  addCategory: (name: string) => void;
  renameCategory: (id: string, name: string) => void;
  removeCategory: (id: string) => void;
  reorderCategory: (id: string, dir: -1 | 1) => void;

  addDish: (d: Omit<Dish, "id">) => string;
  updateDish: (id: string, patch: Partial<Dish>) => void;
  removeDish: (id: string) => void;

  addFormula: (f: Omit<Formula, "id">) => string;
  updateFormula: (id: string, patch: Partial<Formula>) => void;
  removeFormula: (id: string) => void;
};

const uid = () => Math.random().toString(36).slice(2, 9);

const seedCategories: Category[] = [
  { id: "c1", name: "Entrées", order: 0 },
  { id: "c2", name: "Plats", order: 1 },
  { id: "c3", name: "Desserts", order: 2 },
  { id: "c4", name: "Boissons", order: 3 },
];

const seedDishes: Dish[] = [
  { id: "d1", name: "Burrata di Puglia", desc: "Tomates anciennes, basilic, huile AOP", price: 14, categoryId: "c1", tags: ["veggie"], allergens: ["lactose"], customAllergens: [], available: true },
  { id: "d2", name: "Vitello tonnato", desc: "Veau, sauce thon-câpres", price: 16, categoryId: "c1", tags: [], allergens: ["poisson", "oeuf"], customAllergens: [], available: true },
  { id: "d3", name: "Tagliatelles truffe", desc: "Pâtes fraîches, truffe noire, parmesan 24 mois", price: 22, categoryId: "c2", tags: [], allergens: ["gluten", "lactose", "oeuf"], customAllergens: [], available: true },
  { id: "d4", name: "Risotto Milanese", desc: "Carnaroli, safran, moelle", price: 19, categoryId: "c2", tags: ["veggie"], allergens: ["lactose"], customAllergens: [], available: true },
  { id: "d5", name: "Arrabbiata piccante", desc: "Tomate, ail, piment de Calabre", price: 15, categoryId: "c2", tags: ["spicy", "veggie"], allergens: ["gluten"], customAllergens: [], available: false },
  { id: "d6", name: "Tiramisu maison", desc: "Mascarpone, café, cacao", price: 8, categoryId: "c3", tags: [], allergens: ["lactose", "oeuf", "gluten"], customAllergens: ["alcool"], available: true },
  { id: "d7", name: "Panna cotta", desc: "Crème vanille, coulis fruits rouges", price: 8, categoryId: "c3", tags: ["veggie"], allergens: ["lactose"], customAllergens: [], available: true },
];

const seedFormulas: Formula[] = [
  {
    id: "f1",
    name: "Menu du midi",
    desc: "Entrée + Plat ou Plat + Dessert",
    price: 24,
    dishIds: ["d1", "d4"],
    available: true,
    schedules: [{ days: [1, 2, 3, 4, 5], start: "12:00", end: "14:30" }],
  },
];

export const useConfig = create<ConfigState>()(
  persist(
    (set) => ({
      restaurantName: "La Trattoria",
      logo: undefined,
      timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Europe/Paris",
      categories: seedCategories,
      dishes: seedDishes,
      formulas: seedFormulas,

      setRestaurantName: (n) => set({ restaurantName: n }),
      setLogo: (logo) => set({ logo }),
      setTimezone: (tz) => set({ timezone: tz }),

      addCategory: (name) =>
        set((s) => ({
          categories: [...s.categories, { id: uid(), name, order: s.categories.length }],
        })),
      renameCategory: (id, name) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)) })),
      removeCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          dishes: s.dishes.filter((d) => d.categoryId !== id),
        })),
      reorderCategory: (id, dir) =>
        set((s) => {
          const sorted = [...s.categories].sort((a, b) => a.order - b.order);
          const i = sorted.findIndex((c) => c.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= sorted.length) return {};
          [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
          return { categories: sorted.map((c, idx) => ({ ...c, order: idx })) };
        }),

      addDish: (d) => {
        const id = uid();
        set((s) => ({ dishes: [...s.dishes, { ...d, id }] }));
        return id;
      },
      updateDish: (id, patch) =>
        set((s) => ({ dishes: s.dishes.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      removeDish: (id) =>
        set((s) => ({
          dishes: s.dishes.filter((d) => d.id !== id),
          formulas: s.formulas.map((f) => ({ ...f, dishIds: f.dishIds.filter((x) => x !== id) })),
        })),

      addFormula: (f) => {
        const id = uid();
        set((s) => ({ formulas: [...s.formulas, { ...f, id }] }));
        return id;
      },
      updateFormula: (id, patch) =>
        set((s) => ({ formulas: s.formulas.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      removeFormula: (id) =>
        set((s) => ({ formulas: s.formulas.filter((f) => f.id !== id) })),
    }),
    {
      name: "tabli-config",
      storage: typeof window !== "undefined" ? createJSONStorage(() => localStorage) : undefined,
      skipHydration: true,
    },
  ),
);

export function useConfigHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    useConfig.persist.rehydrate();
    setHydrated(true);
  }, []);
  return hydrated;
}

export function isFormulaActiveNow(f: Formula, timezone: string, now: Date = new Date()): boolean {
  if (!f.available) return false;
  if (!f.schedules || f.schedules.length === 0) return true;
  // Get day-of-week and HH:MM in target timezone
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const wk = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[wk] ?? 0;
  const minutes = parseInt(hh, 10) * 60 + parseInt(mm, 10);
  return f.schedules.some((s) => {
    if (!s.days.includes(day)) return false;
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (end >= start) return minutes >= start && minutes <= end;
    // overnight (e.g., 22:00 -> 02:00)
    return minutes >= start || minutes <= end;
  });
}

export const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
