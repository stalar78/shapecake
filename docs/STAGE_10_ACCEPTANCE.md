# Stage 10 Acceptance — Post-launch UX and Privacy Minimization

## Status

Accepted.

Production acceptance date: `2026-08-10`.

Stage plan:

`8544c90eb96456486c2276868a5f0e1a28943b4a` — `docs: plan stage 10 privacy-minimized public flow`

Key accepted merge commits:

- `c2db8e6c90d4c9724263520fd738730f3216ccb8` — `merge: replace public inquiry with direct contact`;
- `405a0f4f9be87ffcf0ce969882f064ff23c1f8bc` — `merge: add branded site favicon`;
- `7c16558c7b72e8e5912cf07e72053dd3a0b94b24` — `merge: add branded public error pages`;
- `7ecce75043a8e4ebd5b4ccbac51b77d733b80b06` — `merge: polish public contacts and canonical host`;
- `3b3a871e963fd82493ea64ce408fa3c0104d797c` — `merge: improve admin settings workflow`;
- `2caf9ea76f1f3c6a5987f4395d2ae49814978e81` — `merge: polish public contact presentation`.

## Product decision accepted

Cake & Shape is treated primarily as a shareable online replacement for the owner's PDF catalog rather than as a public personal-data intake form.

The accepted public flow is now:

```text
browse homepage/catalog
-> open dessert detail if needed
-> choose a configured direct business contact
-> continue the order discussion outside the website
```

The public inquiry form was removed from the homepage and dessert detail pages.

The existing inquiry backend was intentionally not deleted. FastAPI inquiry routes, inquiry tables/migrations, historical data, typed client contracts, notification adapter boundary and admin inquiry screens remain available for possible future reuse. No destructive schema/history cleanup was introduced as part of Stage 10.

## Privacy-minimization acceptance

Removing the public inquiry form means the current public site no longer asks visitors to submit name/contact/order-request data through the Cake & Shape application flow.

This is a data-minimization decision, not a claim that the entire deployment is free of personal-data considerations. Normal server/proxy/access logging and any future integrations still require ordinary operational/privacy review.

No Web3Forms, SMTP form relay or new third-party form processor was added.

## Public UX acceptance

### Direct-contact flow

Public order CTAs now use only configured `SiteSettings` values. No phone number, email, messenger handle or social URL is hardcoded as business truth by the frontend.

Supported presentation:

- WhatsApp when configured;
- Telegram when configured;
- phone when configured;
- email when configured;
- generic social profile through `social_url`;
- Instagram-specific label/icon when `social_url` points to `instagram.com` or its subdomain.

The dessert-detail CTA retains the current dessert name in the explanatory copy without collecting form input.

### Contact link behavior

Accepted behavior:

- WhatsApp / Telegram / social / Instagram links use a new tab with `noopener noreferrer`;
- phone uses a semantic `tel:` link;
- email uses `mailto:`;
- the operating system/browser remains responsible for choosing which installed application handles `tel:` links.

A desktop browser offering WhatsApp as the registered `tel:` handler is therefore not considered a site defect.

### Contact presentation

The direct-order CTA and public footer now share a restrained line-icon contact language rather than unrelated plain text/buttons.

Footer core information remains:

- phone;
- email;
- address;
- working hours.

Configured messenger/social methods are added conditionally. Missing optional messenger/social methods are omitted rather than invented.

The final contact presentation was visually accepted in production.

## Branded public polish acceptance

Stage 10 added:

- branded SVG favicon/app icon;
- branded `not-found` page;
- branded runtime error page with retry behavior and no technical error leakage;
- clickable footer phone/email;
- canonical host behavior for `www.cakeshape.ru`.

Accepted canonical redirect behavior:

```text
http://cakeshape.ru/...      -> https://cakeshape.ru/...
http://www.cakeshape.ru/...  -> https://cakeshape.ru/...
https://www.cakeshape.ru/... -> https://cakeshape.ru/...
```

Path and query string preservation were verified during production deployment.

## Admin operational UX acceptance

### Expired session handling

Server-side session security was not weakened.

The accepted behavior is:

- HttpOnly cookie authentication remains unchanged;
- CSRF flow remains unchanged;
- session idle/absolute timeout values remain unchanged;
- `ApiError` status `401` while the authenticated workspace is running clears stale local workspace/auth state;
- the admin returns to the login screen with `Сеанс истёк. Войдите снова, чтобы продолжить.`;
- `403` is not treated as equivalent to session expiry;
- logout always clears local authenticated state even if the server session has already expired.

Production acceptance manually verified the stale-session scenario.

### Site Settings contact validation UX

Telegram entry now accepts the operator-friendly form:

```text
@username
```

and normalizes it before save to:

```text
https://t.me/username
```

Already-valid Telegram HTTPS URLs remain unchanged. Empty values remain empty. Arbitrary malformed values are not silently converted.

Backend URL validation remains strict. Site-settings validation errors now surface concise Russian correction guidance where possible rather than exposing raw Pydantic JSON as the primary admin message.

Production acceptance verified successful contact save and friendly validation feedback.

### Site Settings image previews

Craft/About Master image previews are constrained specifically in Site Settings so they remain usable at 100% browser zoom.

The preview uses `object-fit: contain` and explicit maximum dimensions. Generic dessert `.image-frame` behavior was not changed.

Production acceptance visually verified the new preview size.

## Production verification

Stage 10 production deployments followed the accepted safety procedure:

```text
fresh production backup
-> approved/merged Git revision
-> Compose configuration validation
-> narrow service rebuild/recreate where possible
-> container verification
-> public/admin/API smoke
-> browser acceptance
```

Narrow deployments were used for frontend-only changes rather than rebuilding unrelated services.

Observed production acceptance included:

- public site available over HTTPS;
- admin site available over HTTPS;
- API health returned `200` with `{"status":"ok"}`;
- canonical `www` redirects worked;
- direct-contact CTA/footer visual presentation accepted;
- Instagram/social card presentation worked when a suitable `social_url` was configured;
- admin contact save worked;
- Telegram handle normalization worked;
- friendly settings validation worked;
- compact Site Settings image previews worked;
- expired-session admin UX worked.

## Production data / security invariants preserved

- no production database reset or re-import;
- production PostgreSQL/media remain authoritative;
- no `docker compose down -v`;
- no auth tokens moved to localStorage;
- HttpOnly sessions preserved;
- CSRF requirements preserved;
- no session-timeout weakening;
- no secrets or private keys committed;
- no new public form processor introduced;
- inquiry history/schema preserved.

## Client-managed contact data

The application supplies the contact presentation and validation behavior; the client remains responsible for actual current business contact values.

In particular, the client can update `social_url` in Site Settings later. If that URL points to Instagram, the public UI automatically presents it as Instagram. The project should not assume a historical catalog/social handle remains current without client confirmation.

## Deferred / accepted operational risks

Encrypted off-site backup replication is still not implemented. The owner explicitly deferred a separate object-storage backup layer for now. Daily on-host database/media backups remain active, but total VPS loss is therefore still an accepted risk.

Original uploaded media are still stored without a backend resize/compression normalization pipeline; the Stage 10 image work addressed admin preview UX only.

A separate broad privacy/logging subsystem was not added. Removing the public inquiry form was the accepted data-minimization measure for this stage.

## Decision

Stage 10 is accepted in production.

Cake & Shape remains a production catalog with direct business contact as the public conversion path, a retained but dormant inquiry backend/admin subsystem, stable production data, and a now-polished contact/admin operational experience.
