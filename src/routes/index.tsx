import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { ArrowUpRight, Plus } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Tabli — Le service, simplifié." },
      { name: "description", content: "Vos clients scannent, commandent. La cuisine reçoit. Sans serveur, sans attente." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <MockupNav />

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 h-[600px] bg-hero -z-10" />
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 text-center">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-primary">Nouveau · 2026</p>
          <h1 className="mt-6 font-display text-[64px] font-semibold leading-[1.02] tracking-tight md:text-[88px]">
            Le service,<br />
            <span className="text-muted-foreground">simplifié.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-[19px] leading-relaxed text-muted-foreground">
            Vos clients scannent. Commandent. La cuisine reçoit, en temps réel.
            Pas d'app, pas d'attente, pas d'erreur.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/menu" className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-6 py-3 text-[15px] font-medium text-background transition-opacity hover:opacity-90">
              Essayer la démo
            </Link>
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-[15px] font-medium text-primary transition-colors hover:bg-secondary">
              En savoir plus <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Phone preview */}
          <div className="relative mx-auto mt-20 w-full max-w-[340px]">
            <div className="absolute -inset-10 -z-10 rounded-full bg-blue-grad opacity-20 blur-3xl" />
            <div className="rounded-[44px] border-[10px] border-foreground bg-background p-3 shadow-pop">
              <div className="overflow-hidden rounded-[28px] bg-surface">
                <div className="flex items-center justify-between px-5 pt-4 text-[11px]">
                  <span className="font-semibold">9:41</span>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-foreground" />
                    <span className="h-2 w-2 rounded-full bg-foreground" />
                  </div>
                </div>
                <div className="px-5 pt-6 pb-5 text-left">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Table 7</p>
                  <h3 className="mt-1 font-display text-2xl font-semibold">La Trattoria</h3>
                  <div className="mt-5 space-y-2">
                    {[
                      { n: "Burrata di Puglia", p: "14€" },
                      { n: "Tagliatelles truffe", p: "22€" },
                      { n: "Tiramisu maison", p: "8€" },
                    ].map((d) => (
                      <div key={d.n} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-[13px] shadow-xs">
                        <span className="font-medium">{d.n}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{d.p}</span>
                          <button className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Plus className="h-3.5 w-3.5"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-5 w-full rounded-2xl bg-foreground py-3.5 text-[14px] font-medium text-background">
                    Commander · 44€
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three steps */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center font-display text-5xl font-semibold tracking-tight">Trois gestes. C'est tout.</h2>
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", t: "Scan", d: "Le QR code est posé sur la table. Le client scanne, le menu s'ouvre." },
            { n: "02", t: "Commande", d: "Il choisit, personnalise, valide. Le panier est intuitif." },
            { n: "03", t: "Cuisine", d: "Tout arrive en direct sur l'écran cuisine, classé par poste." },
          ].map((s) => (
            <div key={s.n} className="rounded-3xl bg-surface p-8">
              <p className="font-display text-sm font-semibold text-primary">{s.n}</p>
              <h3 className="mt-8 font-display text-3xl font-semibold">{s.t}</h3>
              <p className="mt-3 text-[15px] text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats band */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-[2rem] bg-foreground px-10 py-16 text-background">
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Plus rapide.<br />
            <span className="text-background/60">Plus rentable.</span>
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              { v: "−40%", l: "de temps d'attente" },
              { v: "+25%", l: "de panier moyen" },
              { v: "0", l: "app à installer" },
            ].map((s) => (
              <div key={s.l}>
                <p className="font-display text-6xl font-semibold tracking-tight">{s.v}</p>
                <p className="mt-2 text-[15px] text-background/60">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-6">
          <div className="rounded-3xl bg-surface p-8 md:col-span-4">
            <h3 className="font-display text-3xl font-semibold">Menu vivant</h3>
            <p className="mt-2 max-w-md text-[15px] text-muted-foreground">
              Mettez à jour vos plats en un geste. Les ruptures se synchronisent partout, instantanément.
            </p>
          </div>
          <div className="rounded-3xl bg-surface p-8 md:col-span-2">
            <h3 className="font-display text-3xl font-semibold">Multi-langues</h3>
            <p className="mt-2 text-[15px] text-muted-foreground">FR · EN · IT · ES · DE</p>
          </div>
          <div className="rounded-3xl bg-surface p-8 md:col-span-2">
            <h3 className="font-display text-3xl font-semibold">Routage</h3>
            <p className="mt-2 text-[15px] text-muted-foreground">Chaud, froid, bar, dessert.</p>
          </div>
          <div className="rounded-3xl bg-surface p-8 md:col-span-4">
            <h3 className="font-display text-3xl font-semibold">Données claires</h3>
            <p className="mt-2 max-w-md text-[15px] text-muted-foreground">
              Plats les plus rentables, heures de pointe, paniers moyens. Tout sur une page.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-32 text-center">
        <h2 className="font-display text-5xl font-semibold tracking-tight md:text-6xl">
          Prêt à libérer la salle&nbsp;?
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[17px] text-muted-foreground">
          Installation en 24 h. Sans engagement.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/dashboard" className="rounded-full bg-foreground px-7 py-3.5 text-[15px] font-medium text-background">
            Voir le pilotage
          </Link>
          <Link to="/menu" className="rounded-full px-7 py-3.5 text-[15px] font-medium text-primary hover:bg-secondary">
            Tester côté client
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-[12px] text-muted-foreground">
        © 2026 Tabli
      </footer>
    </div>
  );
}
