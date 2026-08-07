# Stage 08 Plan — Lovable-Based Visual Design Integration and Public UX Polish

## Goal

Replace the functional placeholder presentation of the public Next.js application with the final visual system based on a Lovable-generated reference, while preserving all accepted Stage 01-07 data, API, security and SEO contracts.

This is a design-integration stage, not a backend redesign.

## Required workflow

Stage 08 begins with Lovable, not Codex.

1. Create a complete public-site design reference in Lovable.
2. Export/download the Lovable project.
3. Place the downloaded reference inside the local project references area chosen for Stage 08 review/integration.
4. GPT-Architect reviews the reference and maps it to the existing Next.js routes/components/data contracts.
5. Only then assign implementation work to Codex or a lighter coding agent.

The implementation agent must reproduce/adapt the approved Lovable visual reference inside the existing application rather than replacing the application's business architecture with the Lovable prototype architecture.

## Public surfaces in scope

The design reference should cover the real current public application:

- homepage / catalog surface `/`;
- category/filter state on the catalog surface;
- dessert cards;
- dessert detail `/desserts/[slug]`;
- active promotion presentation and `/promotions/[slug]` detail;
- reviews;
- about-master section;
- order/delivery/pickup/prepayment content;
- contacts and working hours;
- inquiry/order-request form;
- loading/empty/error/unavailable states where visually relevant;
- desktop, tablet and mobile layouts.

Do not design routes or product flows that do not exist in the MVP.

## Visual direction

The design should feel appropriate for a handcrafted premium dessert brand:

- warm, refined and appetizing rather than generic SaaS;
- strong photography-led dessert presentation;
- elegant typography and generous whitespace;
- clear hierarchy and restrained decoration;
- premium but approachable tone;
- mobile-first responsive behavior;
- clear order/inquiry calls to action;
- consistent components and spacing;
- accessible contrast and focus states.

Avoid an overdecorated wedding-template aesthetic, heavy animation, glassmorphism for its own sake, or UI patterns that obscure catalog usability.

## Architecture constraints

Do not change accepted backend/API behavior merely to match the prototype.

Preserve:

- existing public API client boundary;
- current public eligibility semantics for desserts, variants, reviews and promotions;
- current inquiry payload/validation and acknowledgement behavior;
- site-settings-driven business content;
- Stage 07 metadata, canonical, robots, sitemap, JSON-LD and analytics behavior;
- existing safe media URL handling;
- no customer account/cart/payment system.

If Lovable generates static mock data, implementation must replace it with the existing real API-backed data rather than committing duplicated mock content.

## Component strategy

After the Lovable reference is approved, implementation may introduce focused reusable public UI components where they materially improve maintainability, for example:

- site header/navigation;
- hero;
- section heading;
- dessert card/grid;
- promotion card/banner;
- review card;
- contact/order-info blocks;
- inquiry form presentation;
- footer;
- shared buttons/badges/states.

Do not introduce a large design-system framework or unrelated component library solely for Stage 08 unless the Lovable export already uses a lightweight compatible dependency and there is a clear benefit.

## Accessibility and responsiveness

Acceptance requires more than visual similarity.

Check:

- semantic headings and landmarks;
- keyboard-accessible controls;
- visible focus state;
- labels for form controls;
- image alt behavior;
- usable touch targets;
- readable color contrast;
- no horizontal overflow at common mobile widths;
- responsive grids/images/type;
- important content does not depend on hover alone;
- reduced-motion-friendly behavior if animation is introduced.

## Performance constraints

- avoid gratuitous client components;
- retain server rendering where the current app already uses it;
- avoid large animation/video dependencies without a strong reason;
- do not regress SEO rendering;
- do not replace safe existing media behavior with unsafe direct paths;
- keep the design functional with missing optional images/content.

## Admin

The admin application is not part of the Lovable public visual redesign in Stage 08.

Minor admin changes are allowed only if required to support existing public content presentation without changing the accepted domain model.

A dedicated admin visual redesign is not required for MVP unless later explicitly requested.

## Out of scope

- backend/domain redesign;
- new database entities;
- cart/checkout/payment;
- customer accounts;
- general CMS;
- production deployment/Nginx/HTTPS;
- production notification provider;
- object-storage migration;
- new SEO semantics;
- marketing copywriting campaign;
- arbitrary new routes invented by the prototype.

## Verification after implementation

Required automated checks:

- public lint;
- public typecheck;
- public production build.

Then perform manual/runtime visual smoke for:

- desktop homepage;
- mobile homepage;
- dessert detail;
- promotion detail;
- inquiry form;
- catalog filtering;
- unavailable/empty states;
- responsive navigation;
- metadata/robots/sitemap remaining intact.

## Acceptance criteria

- implementation visibly follows the approved Lovable reference;
- all real data comes from existing application/API contracts;
- no mock prototype data becomes production business data;
- public functionality from Stage 01-07 remains intact;
- responsive behavior is deliberate across mobile/desktop;
- accessibility fundamentals are present;
- SEO output is preserved;
- inquiry flow remains usable and validated;
- lint/typecheck/build pass;
- visual/runtime smoke is accepted.

## Next stage after acceptance

Production readiness and deployment: Nginx/reverse proxy, HTTPS/domain configuration, environment hardening, backups/restore procedure, production notification integration decisions, deployment/runbook and final acceptance smoke.
