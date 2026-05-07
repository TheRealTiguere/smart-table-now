## Contexte

Aujourd'hui Tabli est 100% côté navigateur : tout (commandes, carte, mots de passe, tables) vit dans `localStorage`. Pour faire un vrai produit déployable chez tes clients, il faut un backend. Tu m'as dit deux choses cruciales :

1. **Multi-tenant** : un compte super-admin gère plusieurs restaurants
2. **Base de données portable (Postgres)** : zéro dépendance à Lovable Cloud

Ces deux contraintes m'amènent à une architecture précise.

## Architecture proposée

```text
┌─────────────────────────────────────────────────────────┐
│                    TanStack Start                        │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────┐  │
│  │  /menu (QR)   │  │  /admin (resto) │  │ /super-admin│ │
│  │  client side  │  │  username+pwd   │  │ (multi-resto)│
│  └───────┬───────┘  └────────┬────────┘  └──────┬─────┘ │
│          │                    │                   │      │
│          └────── createServerFn ──────────────────┘      │
│                          │                               │
│          ┌───────────────▼───────────────┐               │
│          │   src/server/db/index.ts       │               │
│          │   (interface DB pluggable)     │               │
│          └───────────────┬───────────────┘               │
│                          │                               │
│          ┌───────────────┴───────────────┐               │
│          │  Driver: Postgres (pg/drizzle)│               │
│          │  via DATABASE_URL              │               │
│          └────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

- **Toute la logique métier passe par `createServerFn`** (déjà supporté par TanStack Start)
- **Driver DB unique** : `pg` + Drizzle ORM, configuré via `DATABASE_URL`
- **Tu peux self-hoster** sur n'importe quel Postgres (Neon, Railway, RDS, ton propre serveur, etc.)
- **Pas de Lovable Cloud requis**

## Plan d'exécution (en étapes)

Vu l'ampleur, je propose de découper en 3 livraisons. Tu valides chacune avant la suivante.

### Étape 1 — Fondations backend & multi-tenant (cette livraison)

1. **Schéma Postgres** (Drizzle migrations) :
   - `tenants` : id, slug, nom_restaurant, logo, timezone, created_at
   - `users` : id, username, password_hash (bcrypt), role (`super_admin` | `restaurant_admin`), tenant_id (nullable pour super_admin)
   - `categories`, `dishes`, `formulas`, `tables`, `orders`, `order_items` — tous avec `tenant_id`
   - `sessions` : tokens d'auth (cookie httpOnly chiffré via `useSession` de TanStack)

2. **Auth maison portable** (pas de Supabase Auth) :
   - Server functions : `loginFn`, `logoutFn`, `getMeFn`
   - Cookie de session signé (`SESSION_SECRET` env var)
   - Middleware `requireAuth(role?)` pour protéger routes/server-fns

3. **Migration localStorage → DB** :
   - Toutes les opérations (`addOrder`, `addDish`, `addTable`, etc.) deviennent des server functions
   - Le store Zustand devient un cache local hydraté depuis le serveur
   - Polling léger (ou SSE plus tard) pour la cuisine en temps réel

4. **Variables d'environnement** :
   - `DATABASE_URL` (postgres://...)
   - `SESSION_SECRET` (clé d'encryption cookies)

### Étape 2 — Onboarding & deployment

1. **Page `/setup` (premier lancement)** :
   - Détecte BD vide → wizard
   - Crée le compte super-admin (username, password, email)
   - Crée le premier tenant restaurant (nom, timezone)
   - Crée le compte admin du restaurant

2. **Page `/super-admin`** : liste tenants, créer/suspendre/supprimer un restaurant, créer le compte admin associé

3. **Page `/admin/login`** refondue : username + password (au lieu du mot de passe unique actuel)

### Étape 3 — Import menu par collage + resync

1. **Page `/admin/menu/import`** :
   - Zone de texte : "Colle le contenu de ta page Uber Eats / Deliveroo"
   - Parser côté serveur (heuristiques regex/structure) qui détecte : nom du restaurant, catégories, plats, prix, descriptions
   - Aperçu avant import : "Voici ce qu'on a détecté, valide ou corrige"
   - Confirmation → écrit dans la DB du tenant

2. **Bouton "Resynchroniser"** dans `/admin/menu` (ouvre la même page)

3. **(Optionnel)** : Hook prêt pour brancher plus tard un vrai scraper (Firecrawl) si tu changes d'avis

## Détails techniques (pour info)

- **Drizzle** plutôt que Prisma : plus léger, compatible edge/Workers, schémas typés
- **bcryptjs** : portable côté serveur Node (pas de binaire natif)
- **Cookies de session** : TanStack `useSession` (chiffrement AES intégré)
- **Migrations** : `drizzle-kit generate` + `drizzle-kit migrate`, scripts npm
- **Documentation** : un `README-DEPLOY.md` expliquant comment self-héberger (Docker, env vars, première migration, première création de super-admin via CLI ou /setup)

## Points à valider avant que je commence

1. **OK pour Drizzle ORM + Postgres + bcryptjs ?** (stack standard, portable partout)
2. **OK pour découper en 3 étapes ?** Étape 1 d'abord = fondations + auth + migration vers DB. C'est la plus longue (probablement plusieurs allers-retours).
3. **Pour le dev en local sandbox** : je peux activer **Lovable Cloud** uniquement comme Postgres de dev (sa DB sous-jacente *est* Postgres standard). Au déploiement chez un client, tu pointes `DATABASE_URL` vers leur Postgres. Code 100% portable. **OK ?** Sinon il faut que tu me fournisses un `DATABASE_URL` externe maintenant pour tester.

Dis-moi ce que tu valides et je démarre l'étape 1.
