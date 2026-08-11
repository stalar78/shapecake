type NutritionFactsProps = {
  calories: number | null
  proteins: string | number | null
  fats: string | number | null
  carbohydrates: string | number | null
  variant?: 'card' | 'detail'
  large?: boolean
  className?: string
}

type NutritionItem = {
  key: string
  value: string
  label: string
}

export function NutritionFacts({
  calories,
  proteins,
  fats,
  carbohydrates,
  variant = 'card',
  large = false,
  className = '',
}: NutritionFactsProps) {
  const items: NutritionItem[] = [
    createItem('calories', calories, 'ккал'),
    createItem('proteins', proteins, 'белки'),
    createItem('fats', fats, 'жиры'),
    createItem('carbohydrates', carbohydrates, 'углеводы'),
  ].filter((item): item is NutritionItem => item !== null)

  if (!items.length) {
    return null
  }

  if (variant === 'detail') {
    return (
      <section
        aria-label="Пищевая ценность на 100 г"
        className={`mt-10 border border-[var(--line)] bg-[rgba(250,247,242,0.76)] px-5 py-6 md:px-7 md:py-7 ${className}`.trim()}
      >
        <p className="eyebrow">Пищевая ценность</p>
        <p className="mt-2 text-sm text-[var(--muted)]">на 100 г</p>
        <dl className={`mt-6 grid gap-4 md:gap-5 ${detailColumnsClass(items.length)}`}>
          {items.map((item, index) => (
            <div
              className={`flex min-w-0 flex-col ${index > 0 ? 'md:border-l md:border-[var(--line)] md:pl-5' : ''}`}
              key={item.key}
            >
              <dt className="order-2 mt-3 text-[0.72rem] font-extrabold uppercase tracking-[0.22em] text-[var(--primary-strong)]">
                {item.label}
              </dt>
              <dd className="display order-1 text-4xl font-semibold leading-none md:text-5xl">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    )
  }

  return (
    <section
      aria-label="КБЖУ на 100 г"
      className={`mt-5 border-t border-[var(--line)] pt-4 transition-colors duration-300 group-hover:border-[rgba(138,79,89,0.38)] group-focus-visible:border-[rgba(138,79,89,0.38)] motion-reduce:transition-none ${className}`.trim()}
    >
      <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[var(--primary-strong)]">
        КБЖУ · на 100 г
      </p>
      <dl className={`mt-3 grid gap-3 ${cardColumnsClass(items.length)}`}>
        {items.map((item, index) => (
          <div
            className={`flex min-w-0 flex-col transition-transform duration-300 group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none ${
              index > 0 ? 'md:border-l md:border-[var(--line)] md:pl-3' : ''
            }`}
            key={item.key}
          >
            <dt className="order-2 mt-2 text-[0.72rem] leading-4 text-[var(--muted)]">{item.label}</dt>
            <dd
              className={`display order-1 font-semibold leading-none ${
                large ? 'text-[1.85rem] md:text-[2rem]' : 'text-[1.55rem] md:text-[1.8rem]'
              }`}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function createItem(key: string, value: number | string | null, label: string): NutritionItem | null {
  const formatted = formatNutritionValue(value)
  if (!formatted) {
    return null
  }
  return { key, value: formatted, label }
}

function formatNutritionValue(value: number | string | null): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)
  }

  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  const [wholePart, fractionalPart = ''] = normalized.split('.')
  const meaningfulFraction = fractionalPart.replace(/0+$/, '')
  return meaningfulFraction ? `${wholePart},${meaningfulFraction}` : wholePart
}

function cardColumnsClass(count: number): string {
  switch (count) {
    case 1:
      return 'grid-cols-1'
    case 2:
      return 'grid-cols-2'
    case 3:
      return 'grid-cols-2 md:grid-cols-3'
    default:
      return 'grid-cols-2 md:grid-cols-4'
  }
}

function detailColumnsClass(count: number): string {
  switch (count) {
    case 1:
      return 'grid-cols-1'
    case 2:
      return 'grid-cols-2'
    case 3:
      return 'grid-cols-2 md:grid-cols-3'
    default:
      return 'grid-cols-2 md:grid-cols-4'
  }
}
