# Initial Catalog Import

This operator note describes the Stage 10 draft catalog import for Cake & Shape.

## Purpose

The importer creates the initial cake catalog as draft admin content. It creates the catalog category, dessert records, variants, and available staged images in the existing media storage.

Imported desserts are always created with:

```text
is_published = false
is_available = true
```

The client must verify names, prices, weights, composition, nutrition, photos, and ordering conditions before any product is published.

## Source Assets

Prepared product images must stay outside Git. The expected source root is:

```powershell
C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake-assets\catalog
```

Each product folder should be named by dessert slug and may contain:

```text
<slug>-cover.png
<slug>-detail.png
```

`krasnyy-barkhat` currently has only a cover image. Missing detail images are warnings, not fatal errors. Missing cover images are also warnings; the product remains unpublished.

## Dry Run

From `apps/api`:

```powershell
python -m app.catalog_import --assets-root "C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake-assets\catalog" --dry-run
```

Dry run reports category action, products that would be created or skipped, variants, and detected or missing images. It does not write database rows or media files.

## Real Import

From `apps/api`:

```powershell
python -m app.catalog_import --assets-root "C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake-assets\catalog"
```

The command uses the normal API settings, including `DATABASE_URL`, `MEDIA_ROOT`, `MEDIA_PUBLIC_BASE_URL`, and `MAX_UPLOAD_BYTES`.

## Safety And Idempotency

- Desserts are identified by slug.
- Existing dessert slugs are skipped by default.
- Existing admin or client edits are not overwritten.
- Unrelated categories, desserts, variants, and images are not deleted, archived, or reset.
- The importer does not use test database reset helpers.
- Image storage and validation reuse the existing media storage layer used by admin uploads.
- If a dessert import fails after writing media files, the importer attempts to remove those newly written files.

## Verification

After import, verify through the admin catalog:

1. Category `Торты` / `torty` exists only once.
2. The 10 imported desserts exist and are unpublished.
3. Prices are shown as RUB values derived from stored minor units.
4. Cover images are primary where present.
5. Detail images are secondary where present.
6. Missing images are reviewed before publication.

Publish products only after the client confirms all source facts and photos.
