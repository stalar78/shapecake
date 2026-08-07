# Stage 07 Acceptance — SEO and Public Discoverability Foundation

## Status

Accepted.

Implementation commit:

`dfc183f8e1f7672c620c780a28e5b73c194e7dcd` — `feat: implement stage 07 seo foundation`

## Accepted scope

- canonical public origin derived only from controlled environment configuration;
- safe localhost fallback for development;
- native Next.js App Router metadata foundation;
- root/default title, description, metadataBase, canonical and Open Graph output;
- route metadata for homepage, dessert detail and promotion detail;
- unavailable dessert pages are not indexed and do not emit Product JSON-LD;
- native `robots.txt` route;
- native `sitemap.xml` route;
- sitemap dynamically includes all available public desserts and active public promotions through bounded paginated API reads;
- sitemap uses deterministic offsets, API totals, empty-page termination, defensive page cap and URL deduplication;
- dynamic sitemap failures degrade to the safe root entry rather than breaking generation;
- Bakery JSON-LD uses only existing public site-setting data;
- Product JSON-LD uses only existing public dessert data without invented offers/prices;
- JSON-LD serialization escapes script-breaking `<` characters;
- dessert Open Graph can reuse the existing public media URL;
- optional Google Analytics and Yandex Metrica integrations emit no tracking scripts without valid explicit environment configuration;
- no SEO CMS, analytics backend or deployment coupling was introduced.

## Verification

Public frontend checks were successful:

- lint passed;
- typecheck passed;
- production build passed;
- build exposes `robots.txt` and `sitemap.xml` routes.

The final sitemap pagination correction was separately reviewed from the actual source file and accepted.

## Notes

The public application currently uses `/` as the catalog surface. A separate `/catalog` route does not exist, so the sitemap intentionally does not invent one.

Production canonical origin must be configured before deployment. The development fallback is intentionally not a production-domain substitute.

## Decision

Stage 07 is accepted and the project advances to Stage 08: Lovable-based visual design integration and public UX polish.
