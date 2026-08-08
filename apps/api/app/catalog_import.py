from __future__ import annotations

import argparse
import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.categories.models import Category
from app.core.config import Settings, get_settings
from app.db.session import AsyncSessionLocal
from app.desserts.models import Dessert, DessertImage, DessertVariant
from app.media.storage import LocalMediaStorage

CATEGORY_NAME = "Торты"
CATEGORY_SLUG = "torty"


@dataclass(frozen=True)
class VariantSpec:
    weight_value: str
    price_rub: int
    weight_unit: str = "kg"

    @property
    def price_minor(self) -> int:
        return self.price_rub * 100


@dataclass(frozen=True)
class DessertSpec:
    name: str
    slug: str
    calories: int
    proteins: str
    fats: str
    carbohydrates: str
    ingredients: str
    variants: tuple[VariantSpec, ...]
    warnings: str = ""


@dataclass
class ImportSummary:
    dry_run: bool
    category_action: str = ""
    created: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


CATALOG: tuple[DessertSpec, ...] = (
    DessertSpec(
        name="Шоколадно-кокосовый баунти",
        slug="shokoladno-kokosovyy-bounty",
        calories=150,
        proteins="6",
        fats="10",
        carbohydrates="11",
        ingredients=(
            "рисовая мука, кокосовое молоко, яйца, рикотта, какао, кокосовая стружка, "
            "тёмный шоколад без сахара, кукурузный крахмал, подсластитель, желатин"
        ),
        variants=(VariantSpec("1.2", 2800), VariantSpec("1.6", 3500)),
    ),
    DessertSpec(
        name="Красный бархат с какао",
        slug="krasnyy-barkhat-s-kakao",
        calories=130,
        proteins="9",
        fats="6",
        carbohydrates="9",
        ingredients=(
            "рисовая мука, сухое обезжиренное молоко, ванильный протеин, какао, яйца, "
            "кукурузный крахмал, мягкий обезжиренный творог, сметана 10%, творожный сыр, "
            "клубника, агар-агар, подсластитель, натуральный краситель «Красный бархат»"
        ),
        variants=(VariantSpec("1.2", 2600), VariantSpec("1.6", 3300)),
    ),
    DessertSpec(
        name="Красный бархат",
        slug="krasnyy-barkhat",
        calories=130,
        proteins="9",
        fats="6",
        carbohydrates="9",
        ingredients=(
            "рисовая мука, сухое обезжиренное молоко, ванильный протеин, какао, яйца, "
            "кукурузный крахмал, мягкий обезжиренный творог, сметана 10%, творожный сыр, "
            "клубника, агар-агар, подсластитель, натуральный краситель «Красный бархат»"
        ),
        variants=(VariantSpec("1.2", 2600), VariantSpec("1.6", 3300)),
    ),
    DessertSpec(
        name="Абрикос–чёрная смородина",
        slug="abrikos-chernaya-smorodina",
        calories=138,
        proteins="7",
        fats="6",
        carbohydrates="14",
        ingredients=(
            "безглютеновая смесь «Гарнец», сухое обезжиренное молоко, яйцо, молоко, "
            "сметана, мягкий творог, творожный сыр, абрикосовое пюре, чёрная смородина, "
            "лимонный сок, агар-агар, подсластитель Prebiosweet, желатин, ванильный экстракт"
        ),
        variants=(VariantSpec("1.2", 2600), VariantSpec("1.6", 3300)),
        warnings="возможно использование любимых ягодных наполнителей",
    ),
    DessertSpec(
        name="Муссовый торт «Вишня-апельсин»",
        slug="vishnya-apelsin",
        calories=125,
        proteins="11",
        fats="6",
        carbohydrates="6",
        ingredients=(
            "безглютеновая смесь «Гарнец», рисовая мука, какао, яйца, рикотта, вишня, "
            "апельсиновый сок, кофе, сливки, цедра апельсина, агар-агар, подсластитель, желатин"
        ),
        variants=(VariantSpec("1.2", 2500),),
    ),
    DessertSpec(
        name="Малиновое рафаэлло",
        slug="malinovoe-rafaello",
        calories=142,
        proteins="7",
        fats="8",
        carbohydrates="9",
        ingredients=(
            "цельнозерновая рисовая мука, миндальная мука, ванильный протеин, сухое "
            "обезжиренное молоко, яйцо, кокосовое молоко, кокосовая стружка, творожный сыр, "
            "малиновое пюре, кукурузный крахмал, сахарозаменитель, разрыхлитель, желатин, "
            "агар-агар"
        ),
        variants=(VariantSpec("1.4", 3000), VariantSpec("1.6", 3300)),
    ),
    DessertSpec(
        name="Медовик",
        slug="medovik",
        calories=187,
        proteins="11",
        fats="4",
        carbohydrates="26",
        ingredients=(
            "цельнозерновая пшеничная мука, овсяная мука, цельнозерновая рисовая мука, "
            "яйцо, ряженка, кокосовое масло, мёд, мягкий творог, рикотта, натуральный "
            "сахарозаменитель, ваниль, корица, сода"
        ),
        variants=(VariantSpec("1.2", 2500), VariantSpec("1.6", 3000)),
        warnings="возможно добавить чернослив / курагу",
    ),
    DessertSpec(
        name="Фундучный тирамису",
        slug="hazelnut-tiramisu",
        calories=133,
        proteins="7",
        fats="6",
        carbohydrates="12",
        ingredients=(
            "цельнозерновая рисовая мука, фундучная мука, яйцо, безлактозное молоко, "
            "крахмал, натуральный сахарозаменитель, эритритол, желатин, какао"
        ),
        variants=(VariantSpec("1.1", 2500),),
    ),
    DessertSpec(
        name="Три шоколада",
        slug="tri-shokolada",
        calories=182,
        proteins="10",
        fats="13",
        carbohydrates="9",
        ingredients=(
            "овсяная мука, безлактозное молоко, мягкий творог, творожный сыр, рикотта, "
            "яйцо, горький шоколад без сахара, молочный шоколад без сахара, белый шоколад "
            "без сахара, крахмал, желатин, натуральный сахарозаменитель, эритритол, какао"
        ),
        variants=(VariantSpec("1.1", 3000),),
    ),
    DessertSpec(
        name="Чизкейк New York",
        slug="cheesecake-new-york",
        calories=140,
        proteins="11",
        fats="5",
        carbohydrates="12",
        ingredients=(
            "цельнозерновая мука, яйцо, рикотта, мягкий творог, молоко, кокосовое масло, "
            "разрыхлитель, кукурузный крахмал, подсластитель Prebiosweet, ваниль"
        ),
        variants=(VariantSpec("1.2", 2500),),
    ),
)


async def import_initial_catalog(
    db: AsyncSession,
    *,
    assets_root: Path,
    settings: Settings,
    dry_run: bool = False,
) -> ImportSummary:
    assets_root = assets_root.resolve()
    summary = ImportSummary(dry_run=dry_run)
    if not assets_root.exists() or not assets_root.is_dir():
        summary.errors.append(f"Assets root not found: {assets_root}")
        return summary

    category = await db.scalar(select(Category).where(Category.slug == CATEGORY_SLUG))
    if category is None:
        summary.category_action = f"create category {CATEGORY_SLUG}"
        if not dry_run:
            category = Category(
                name=CATEGORY_NAME,
                slug=CATEGORY_SLUG,
                description="",
                sort_order=int(await db.scalar(select(func.count()).select_from(Category)) or 0),
                is_visible=True,
            )
            db.add(category)
            await db.commit()
            await db.refresh(category)
    else:
        summary.category_action = f"use existing category {CATEGORY_SLUG}"

    for spec in CATALOG:
        existing = await db.scalar(select(Dessert.id).where(Dessert.slug == spec.slug))
        image_plan = _image_plan(assets_root, spec, summary)
        if existing is not None:
            summary.skipped.append(spec.slug)
            continue
        if dry_run:
            summary.created.append(spec.slug)
            _summarize_dry_run(summary, spec, image_plan)
            continue
        if category is None:
            summary.errors.append("Category resolution failed")
            break
        try:
            await _create_dessert(db, spec, category.id, image_plan, settings)
            summary.created.append(spec.slug)
        except Exception as exc:  # noqa: BLE001 - CLI/import summary must continue with other desserts.
            await db.rollback()
            summary.errors.append(f"{spec.slug}: {exc}")
    return summary


def print_summary(summary: ImportSummary) -> None:
    mode = "DRY RUN" if summary.dry_run else "IMPORT"
    print(f"{mode}: {summary.category_action}")
    for slug in summary.created:
        print(f"CREATE {slug}")
    for slug in summary.skipped:
        print(f"SKIP existing {slug}")
    for warning in summary.warnings:
        print(f"WARNING {warning}")
    for error in summary.errors:
        print(f"ERROR {error}")


async def _create_dessert(
    db: AsyncSession,
    spec: DessertSpec,
    category_id: int,
    image_plan: list[tuple[str, Path | None]],
    settings: Settings,
) -> None:
    written_keys: list[str] = []
    try:
        dessert = Dessert(
            category_id=category_id,
            name=spec.name,
            slug=spec.slug,
            short_description="",
            full_description="",
            ingredients=spec.ingredients,
            allergens="",
            warnings=spec.warnings,
            calories=spec.calories,
            proteins=Decimal(spec.proteins),
            fats=Decimal(spec.fats),
            carbohydrates=Decimal(spec.carbohydrates),
            preparation_time_text="",
            is_published=False,
            is_available=True,
            is_sugar_free=False,
            is_gluten_free=False,
            is_low_calorie=False,
            is_bento=False,
            is_new=False,
            is_popular=False,
            is_seasonal=False,
            sort_order=int(await db.scalar(select(func.count()).select_from(Dessert)) or 0),
        )
        db.add(dessert)
        await db.flush()
        for index, variant in enumerate(spec.variants):
            db.add(
                DessertVariant(
                    dessert_id=dessert.id,
                    weight_value=Decimal(variant.weight_value),
                    weight_unit=variant.weight_unit,
                    price=variant.price_minor,
                    old_price=None,
                    is_available=True,
                    sort_order=index,
                )
            )
        for sort_order, (kind, source) in enumerate(image_plan):
            if source is None:
                continue
            image, storage_key = _import_image_file(
                source,
                dessert_id=dessert.id,
                dessert_name=spec.name,
                kind=kind,
                sort_order=sort_order,
                settings=settings,
            )
            written_keys.append(storage_key)
            db.add(image)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        _cleanup_written_files(written_keys, settings)
        raise
    except Exception:
        await db.rollback()
        _cleanup_written_files(written_keys, settings)
        raise


def _image_plan(
    assets_root: Path,
    spec: DessertSpec,
    summary: ImportSummary,
) -> list[tuple[str, Path | None]]:
    folder = assets_root / spec.slug
    cover = folder / f"{spec.slug}-cover.png"
    detail = folder / f"{spec.slug}-detail.png"
    plan: list[tuple[str, Path | None]] = []
    if cover.exists():
        plan.append(("cover", cover))
    else:
        summary.warnings.append(f"{spec.slug}: missing cover image {cover}")
        plan.append(("cover", None))
    if detail.exists():
        plan.append(("detail", detail))
    else:
        summary.warnings.append(f"{spec.slug}: missing optional detail image {detail}")
    return plan


def _summarize_dry_run(
    summary: ImportSummary,
    spec: DessertSpec,
    image_plan: list[tuple[str, Path | None]],
) -> None:
    variants = ", ".join(
        f"{variant.weight_value} {variant.weight_unit} -> {variant.price_minor}" for variant in spec.variants
    )
    images = ", ".join(f"{kind}:{'present' if path else 'missing'}" for kind, path in image_plan)
    summary.warnings.append(f"{spec.slug}: variants [{variants}], images [{images}]")


def _import_image_file(
    source: Path,
    *,
    dessert_id: int,
    dessert_name: str,
    kind: str,
    sort_order: int,
    settings: Settings,
) -> tuple[DessertImage, str]:
    storage = LocalMediaStorage(settings.media_root, settings.media_public_base_url, settings.max_upload_bytes)
    storage_key, original_filename, mime_type, file_size = storage.save_local_file(source, "image/png")
    alt_suffix = "общий вид" if kind == "cover" else "разрез"
    return (
        DessertImage(
            dessert_id=dessert_id,
            storage_key=storage_key,
            original_filename=original_filename,
            mime_type=mime_type,
            width=None,
            height=None,
            file_size=file_size,
            alt_text=f"{dessert_name} — {alt_suffix}",
            is_primary=kind == "cover",
            sort_order=sort_order,
            created_at=datetime.now(UTC),
        ),
        storage_key,
    )


def _cleanup_written_files(storage_keys: list[str], settings: Settings) -> None:
    storage = LocalMediaStorage(settings.media_root, settings.media_public_base_url, settings.max_upload_bytes)
    for storage_key in storage_keys:
        storage.delete(storage_key)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import initial Cake & Shape draft catalog.")
    parser.add_argument("--assets-root", required=True, type=Path)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


async def async_main() -> int:
    args = parse_args()
    settings = get_settings()
    async with AsyncSessionLocal() as db:
        summary = await import_initial_catalog(
            db,
            assets_root=args.assets_root,
            settings=settings,
            dry_run=args.dry_run,
        )
    print_summary(summary)
    return 0 if summary.ok else 1


def main() -> None:
    raise SystemExit(asyncio.run(async_main()))


if __name__ == "__main__":
    main()
