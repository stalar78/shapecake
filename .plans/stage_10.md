# Stage 10 Plan — Post-launch UX and Privacy Minimization

## Status

Accepted in production on `2026-08-10`.

Acceptance record: `docs/STAGE_10_ACCEPTANCE.md`.

The plan below is preserved as the implementation intent. The accepted stage ultimately included the direct-contact conversion, branded public polish, canonical host behavior, admin operational UX fixes and the final contact-card presentation pass. A separate new privacy/logging subsystem was not introduced; the privacy-minimization decision was to remove the public inquiry form while retaining the existing backend/admin inquiry domain for possible future reuse.

## Goal

Refine the launched Cake & Shape website as a public catalog rather than a client-data intake system, while preserving the accepted production backend and administration architecture.

Stage 10 is a post-launch polish stage. It must not reopen accepted catalog, admin, SEO, production deployment, or data models unless a narrowly scoped fix requires it.

## Product decision

Cake & Shape is primarily a shareable online replacement for the owner's PDF catalog. The public website should help visitors browse desserts and then contact the owner directly by the contact channels already configured in site settings.

The public inquiry/order-request form is no longer part of the intended public UX.

## Pass 10.1 — Remove public inquiry UX

### Required changes

- Remove the public `InquiryForm` from the homepage.
- Remove the public `InquiryForm` from dessert detail pages.
- Remove or delete the now-unused `apps/public/app/InquiryForm.tsx` component if no public references remain.
- Remove imports and browser API helpers that become unused as a consequence.
- Replace public form-oriented CTAs with direct-contact CTAs using existing site settings only.
- Preserve the existing visual language of Cake & Shape.

### Contact CTA behavior

Use only contact data already present in public site settings:

- WhatsApp URL when configured;
- Telegram URL when configured;
- telephone number when configured;
- email when configured where appropriate.

Do not invent phone numbers, email addresses, messenger handles, or external URLs.

The homepage should retain a clear primary action for ordering, but it should scroll/navigate to a contact CTA rather than to a form.

Dessert detail pages should provide a clear way to contact Cake & Shape about the currently viewed dessert without collecting or storing visitor input on the site.

### Copy cleanup

Update public copy that currently implies an on-site request form, including at minimum:

- hero/order CTA destination;
- craft-section wording that refers to discussing wishes "in the request";
- the order-process section;
- terms fallback copy that refers to submitting a request;
- any public labels such as "Как оформить запрос" when they no longer match the contact-based flow.

Do not rewrite unrelated approved content.

### Explicit non-goals

Do not remove or redesign:

- FastAPI inquiry routes;
- inquiry database tables or migrations;
- admin inquiry screens;
- shared inquiry API client contracts;
- historical inquiry data;
- notification adapter architecture.

The backend inquiry subsystem remains dormant/available for possible future use. Stage 10.1 changes only the public acquisition flow.

Do not add Web3Forms, SMTP notifications, another form provider, or another external data processor in this pass.

## Verification

Run the public application checks:

```sh
npm --workspace apps/public run lint
npm --workspace apps/public run typecheck
npm --workspace apps/public run build
```

Manually verify at minimum:

- homepage has no public inquiry form;
- dessert detail has no public inquiry form;
- primary order CTAs lead to the contact flow;
- configured WhatsApp/Telegram/phone/email links render correctly;
- no empty or broken CTA is shown when an individual contact field is absent;
- catalog filtering and dessert detail still work;
- responsive layout has no obvious regressions.

## Accepted later Stage 10 passes

After Pass 10.1, the accepted production stage also delivered:

1. branded favicon/app icon;
2. branded 404 page;
3. branded runtime error page;
4. clickable footer phone/email and contact polish;
5. canonical `www.cakeshape.ru` redirect to the apex domain;
6. expired-session/admin settings UX fixes without changing the authentication security model;
7. Telegram handle normalization and friendlier site-settings validation feedback;
8. constrained Craft/About image previews in Site Settings;
9. unified premium contact-card presentation with restrained inline SVG icons and Instagram detection through `social_url`.

The public form removal is a privacy-minimization measure, not a claim that the entire deployment no longer processes any potentially identifying operational data. Normal infrastructure/access-log and future-integration considerations remain.

## Security and production invariants

- no production secrets or customer data in Git;
- no weakening of HttpOnly session, CSRF, or admin authentication behavior;
- no production database/media reset or re-import;
- no `docker compose down -v`;
- production deployment only after review and explicit approval;
- production PostgreSQL/media remain the source of truth.
