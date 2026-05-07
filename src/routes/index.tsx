import { createFileRoute, Link } from "@tanstack/react-router";
import { MockupNav } from "@/components/MockupNav";
import { QrCode, ChefHat, Smartphone, BarChart3, Clock, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Tabli — Le serveur, en QR code" },
      { name: "description", content: "Vos clients scannent, commandent, la cuisine reçoit. Sans serveur, sans attente." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <MockupNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Nouveau · Disponible en bêta
            </span>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] text-foreground md:text-6xl lg:text-7xl">
              Le serveur,<br />
              <span className="italic text-brand">en QR code.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Vos clients scannent le QR code sur la table, parcourent le menu, commandent.
              La cuisine reçoit en temps réel. Zéro attente, zéro erreur.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/menu" className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90">
                Essayer la démo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/cuisine" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary">
                Voir la cuisine
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div><span className="font-display text-2xl text-foreground">-40%</span><br/>de temps d'attente</div>
              <div className="h-10 w-px bg-border" />
              <div><span className="font-display text-2xl text-foreground">+25%</span><br/>de panier moyen</div>
              <div className="h-10 w-px bg-border" />
              <div><span className="font-display text-2xl text-foreground">0</span><br/>app à installer</div>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 -z-10 bg-gradient-warm rounded-[3rem] blur-3xl opacity-60" />
            <div className="relative w-[300px] rounded-[2.5rem] border-8 border-foreground bg-background p-4 shadow-soft">
              <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-foreground/30" />
              <div className="rounded-2xl bg-cream p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Table 7 · La Trattoria</p>
                    <p className="font-display text-lg font-semibold">Bonsoir 👋</p>
                  </div>
                  <div className="rounded-full bg-brand px-2 py-1 text-[10px] font-medium text-brand-foreground">Live</div>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { n: "Burrata di Puglia", p: "14€" },
                    { n: "Tagliatelles truffe", p: "22€" },
                    { n: "Tiramisu maison", p: "8€" },
                  ].map((d) => (
                    <div key={d.n} className="flex items-center justify-between rounded-xl bg-card p-3 text-sm shadow-soft">
                      <span>{d.n}</span>
                      <span className="font-medium">{d.p}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full rounded-xl bg-foreground py-3 text-sm font-medium text-background">
                  Commander · 44€
                </button>
              </div>
            </div>
            <div className="absolute -right-4 top-10 hidden rounded-2xl border border-border bg-card p-4 shadow-soft md:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><ChefHat className="h-5 w-5"/></div>
                <div>
                  <p className="text-xs text-muted-foreground">Cuisine</p>
                  <p className="text-sm font-medium">Nouvelle commande · T7</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-cream">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center font-display text-4xl font-semibold">Comment ça marche</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Trois étapes, aucune installation côté client.
          </p>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { i: QrCode, t: "1. Scan", d: "Le client scanne le QR posé sur sa table. Il accède au menu instantanément." },
              { i: Smartphone, t: "2. Commande", d: "Il choisit, personnalise et valide. Paiement à table ou en ligne." },
              { i: ChefHat, t: "3. Cuisine", d: "La commande arrive en temps réel sur l'écran cuisine, par table." },
            ].map((s) => (
              <div key={s.t} className="rounded-3xl border border-border bg-card p-8 shadow-soft">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-brand-foreground">
                  <s.i className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-4xl font-semibold">Pensé pour le rythme du service.</h2>
            <p className="mt-4 text-muted-foreground">
              Tabli remplace le carnet de commandes et libère vos équipes pour ce qui compte vraiment :
              accueillir et conseiller.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Menu mis à jour en un clic, ruptures gérées en temps réel",
                "Routage par poste : chaud, froid, bar, dessert",
                "Statistiques et plats les plus rentables",
                "Multi-langues et allergènes",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <Clock className="h-6 w-6 text-brand" />
              <p className="mt-4 font-display text-3xl font-semibold">2 min</p>
              <p className="text-sm text-muted-foreground">de la table à la cuisine</p>
            </div>
            <div className="mt-8 rounded-3xl border border-border bg-foreground p-6 text-background shadow-soft">
              <BarChart3 className="h-6 w-6" />
              <p className="mt-4 font-display text-3xl font-semibold">+25%</p>
              <p className="text-sm opacity-80">de panier moyen</p>
            </div>
            <div className="rounded-3xl bg-gradient-brand p-6 text-brand-foreground shadow-soft">
              <ChefHat className="h-6 w-6" />
              <p className="mt-4 font-display text-3xl font-semibold">Live</p>
              <p className="text-sm opacity-90">commandes en temps réel</p>
            </div>
            <div className="-mt-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
              <QrCode className="h-6 w-6 text-brand" />
              <p className="mt-4 font-display text-3xl font-semibold">0 app</p>
              <p className="text-sm text-muted-foreground">à installer côté client</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="overflow-hidden rounded-[2.5rem] bg-foreground p-12 text-background md:p-16">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <h2 className="font-display text-4xl md:text-5xl">Prêt à libérer votre salle&nbsp;?</h2>
            <div>
              <p className="text-background/80">
                Installation en 24h, sans engagement. On s'occupe du design des QR codes et du menu.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/dashboard" className="rounded-full bg-background px-6 py-3 text-sm font-medium text-foreground">
                  Voir le tableau de bord
                </Link>
                <Link to="/menu" className="rounded-full border border-background/30 px-6 py-3 text-sm font-medium">
                  Tester côté client
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 Tabli — Maquette de présentation
      </footer>
    </div>
  );
}
