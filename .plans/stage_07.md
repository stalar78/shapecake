# Stage 07 Plan — SEO and Public Discoverability Foundation

## Goal

Implement the MVP SEO/discoverability foundation for the public Next.js application without turning the stage into marketing, content production, deployment, or an analytics dashboard.

## Why this stage now

The accepted public product surfaces now exist: homepage, catalog, dessert detail, promotions and inquiry flow. SEO should be added after route/data contracts are stable and before the final Lovable visual pass and production deployment.

## In scope

### Canonical public origin

Introduce one validated public-site origin configuration for metadata URL generation.

Requirements:

- no hardcoded production domain;
- safe development default if the existing config conventions support one;
- production can supply the canonical public origin through environment/config;
- generated canonical/sitemap URLs must be absolute;
- do not expose secrets.

### Next metadata foundation

Use native Next.js App Router metadata APIs.

Add/verify:

- root metadata defaults;
- title template/default;
- description;
- metadata base / canonical handling;
- Open Graph defaults;
- robots directives appropriate for the public site.

Do not add a third-party SEO framework.

### Route-specific metadata

Provide meaningful server-derived metadata for:

- homepage;
- catalog;
- dessert detail by slug;
- promotion detail by slug.

Dessert/promotion metadata must be derived from the same public API data used for rendering and must respect public eligibility/not-found behavior.

Avoid duplicate API work where a simple shared fetch/cache pattern is appropriate, but do not introduce a broad data layer refactor merely for SEO.

### robots.txt and sitemap.xml

Use native Next.js metadata routes where practical.

Sitemap should include only intended indexable public routes, including:

- homepage;
- catalog;
- currently public dessert detail routes;
- currently active/public promotion detail routes.

Do not include:

- admin routes;
- API routes;
- draft/archived/unavailable dessert pages;
- inactive/future/expired promotions;
- inquiry acknowledgement/private data.

Sitemap generation must fail safely if the API is temporarily unavailable; choose a bounded behavior consistent with the existing public frontend error strategy.

### Structured data

Add focused JSON-LD only where supported by real current data.

Homepage:

- `LocalBusiness` / appropriate bakery-like business schema only with available settings data;
- no invented address fields, geo coordinates, ratings, opening-hours structure or legal claims.

Dessert detail:

- product-like structured data only from actual dessert/catalog fields;
- price/offers only if the current public variant data supports an accurate representation;
- do not claim availability/price semantics that the model cannot support accurately.

Use safe JSON serialization for script embedding; do not render untrusted raw JSON strings directly.

### Social metadata images

Reuse an existing public dessert primary image for dessert Open Graph where available.

For routes without suitable media, use metadata without an image rather than adding a new global-media subsystem.

Do not broaden the current dessert-specific media architecture in Stage 07.

### Optional analytics hooks

Implement only lightweight optional hooks if they can remain completely disabled without configuration.

Preferred scope:

- optional Yandex Metrica counter ID;
- optional Google Analytics measurement ID only if already desired by project config conventions.

Requirements:

- no placeholder tracking ID;
- no tracking script when configuration is empty;
- no admin tracking;
- no analytics dashboard/database;
- do not block page rendering if analytics fails.

If clean optional integration would add disproportionate complexity, defer analytics and document that decision in the implementation report rather than expanding the stage.

## Out of scope

- keyword research;
- writing SEO articles;
- paid promotion;
- Search Console/Webmaster account operations;
- DNS/domain configuration;
- production deployment;
- Nginx/HTTPS configuration;
- cookie-consent platform redesign;
- analytics dashboard or event taxonomy;
- final Lovable visual design;
- global media redesign;
- arbitrary CMS fields for SEO.

## Data and security rules

- Metadata and structured data use public-facing data only.
- No admin/private inquiry data is exposed.
- No secrets are placed in generated HTML.
- Do not invent business facts absent from site settings/catalog data.
- Canonical URLs are derived from validated configuration and known internal route slugs, not arbitrary request headers.
- Never trust `Host`/forwarded headers as canonical production origin without an explicit trusted-proxy design.

## Expected implementation surface

Likely public-app files only, plus typed client only if a missing public listing method is genuinely needed.

Possible files:

- `apps/public/app/layout.tsx`;
- metadata route files such as `robots.ts` and `sitemap.ts`;
- catalog/home/detail route files;
- one small metadata/SEO helper module;
- public app environment example/config if needed;
- focused tests where the existing frontend test setup makes them useful.

No database migration is expected.

## Verification

Codex should run only useful checks:

- public frontend lint;
- public frontend typecheck;
- public frontend production build;
- any focused tests added for pure helpers/metadata generation.

Run API tests only if API/client code is changed.

## Executor strategy

Codex handles implementation and critical automated verification only.

Codex should not spend tokens on:

- Git;
- docs/README/blueprint;
- archives;
- Docker production builds;
- live Compose smoke;
- deployment/domain operations;
- verbose reports.

GPT-Architect handles review/docs/GitHub. The user handles local runtime/build/Git operations after review.

## Acceptance criteria

- public pages have coherent native Next metadata;
- canonical URLs use one controlled public origin;
- robots and sitemap are generated intentionally;
- sitemap contains only eligible public content;
- dessert/promotion detail metadata follows the same public eligibility as rendering;
- structured data contains no invented facts/private data;
- Open Graph reuses existing safe public media when available;
- optional analytics, if implemented, emits no script without configuration;
- no generic SEO CMS or broad architecture is introduced;
- public lint/typecheck/build pass.
