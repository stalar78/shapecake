export type PublicCategory = {
  id: number
  name: string
  slug: string
  description: string
}

export type DessertVariant = {
  id: number
  dessert_id: number
  weight_value: string
  weight_unit: 'g' | 'kg' | 'pcs'
  price: number
  old_price: number | null
  is_available: boolean
  sort_order: number
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type DessertImage = {
  id: number
  dessert_id: number
  url: string
  original_filename: string
  mime_type: string
  width: number | null
  height: number | null
  file_size: number
  alt_text: string
  is_primary: boolean
  sort_order: number
  created_at: string
  deleted_at: string | null
}

export type PublicDessertSummary = {
  id: number
  category_id: number
  category_slug: string
  name: string
  slug: string
  short_description: string
  is_available: boolean
  is_sugar_free: boolean
  is_gluten_free: boolean
  is_low_calorie: boolean
  is_bento: boolean
  is_new: boolean
  is_popular: boolean
  is_seasonal: boolean
  primary_image: DessertImage | null
  variants: DessertVariant[]
}

export type PublicDessertDetail = PublicDessertSummary & {
  full_description: string
  ingredients: string
  allergens: string
  warnings: string
  calories: number | null
  proteins: string | null
  fats: string | null
  carbohydrates: string | null
  preparation_time_text: string
  images: DessertImage[]
}

export type PublicCatalog = {
  items: PublicDessertSummary[]
  total: number
  limit: number
  offset: number
}

export type SiteSettings = {
  hero_title: string
  hero_text: string
  about_master_title: string
  about_master_text: string
  phone: string
  email: string
  whatsapp_url: string
  telegram_url: string
  social_url: string
  address_text: string
  delivery_text: string
  pickup_text: string
  prepayment_text: string
  order_terms_text: string
  working_hours_text: string
}

export type DessertReference = {
  id: number
  name: string
  slug: string
}

export type PublicReview = {
  id: number
  dessert_id: number | null
  dessert: DessertReference | null
  author_name: string
  rating: number
  text: string
  is_featured: boolean
}

export type PublicReviewList = {
  items: PublicReview[]
  total: number
  limit: number
  offset: number
}

export type PublicPromotion = {
  id: number
  dessert_id: number | null
  dessert: DessertReference | null
  slug: string
  title: string
  summary: string
  body: string
  starts_at: string | null
  ends_at: string | null
}

export type PublicPromotionList = {
  items: PublicPromotion[]
  total: number
  limit: number
  offset: number
}

export type AdminCategory = PublicCategory & {
  sort_order: number
  is_visible: boolean
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type AdminDessert = PublicDessertDetail & {
  category_id: number
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type AdminReview = {
  id: number
  dessert_id: number | null
  dessert: DessertReference | null
  author_name: string
  rating: number
  text: string
  is_published: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type AdminPromotion = {
  id: number
  dessert_id: number | null
  dessert: DessertReference | null
  slug: string
  title: string
  summary: string
  body: string
  is_published: boolean
  sort_order: number
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type AdminUser = {
  id: number
  email: string
}

export type InquiryStatus = 'new' | 'in_progress' | 'waiting_customer' | 'confirmed' | 'completed' | 'cancelled' | 'spam'
export type PreferredContactChannel = 'phone' | 'email' | 'whatsapp' | 'telegram'
export type FulfillmentMethod = 'pickup' | 'delivery'

export type PublicInquiryInput = {
  customer_name: string
  phone?: string | null
  email?: string | null
  preferred_contact_channel: PreferredContactChannel
  dessert_id?: number | null
  variant_id?: number | null
  fulfillment_method: FulfillmentMethod
  requested_date?: string | null
  quantity?: number | null
  recipe_preferences?: string
  decor_preferences?: string
  message: string
  consent_personal_data: boolean
}

export type PublicInquiryAcknowledgement = {
  acknowledgement: string
  public_reference: string
  created_at: string
}

export type InquiryStatusHistory = {
  id: number
  from_status: InquiryStatus
  to_status: InquiryStatus
  changed_at: string
  administrator_id: number | null
}

export type AdminInquiry = {
  id: number
  public_reference: string
  dessert_id: number | null
  dessert_name_snapshot: string | null
  variant_id: number | null
  variant_weight_value_snapshot: string | null
  variant_weight_unit_snapshot: string | null
  fulfillment_method: FulfillmentMethod
  dessert: { id: number; name: string; slug: string } | null
  customer_name: string
  phone: string | null
  email: string | null
  preferred_contact_channel: PreferredContactChannel
  requested_date: string | null
  quantity: number | null
  recipe_preferences: string
  decor_preferences: string
  message: string
  consent_personal_data: boolean
  status: InquiryStatus
  internal_notes: string
  created_at: string
  updated_at: string
  status_changed_at: string
  completed_at: string | null
  cancelled_at: string | null
  spam_marked_at: string | null
  status_history: InquiryStatusHistory[]
}

export type AdminInquiryList = {
  items: AdminInquiry[]
  total: number
  limit: number
  offset: number
}

export type AdminInquiryFilters = {
  status?: InquiryStatus
  preferred_contact_channel?: PreferredContactChannel
  dessert_id?: number
  requested_from?: string
  requested_to?: string
  created_from?: string
  created_to?: string
  search?: string
  limit?: number
  offset?: number
}

export type AdminOverviewInquiry = {
  id: number
  public_reference: string
  status: InquiryStatus
  dessert_name_snapshot: string | null
  requested_date: string | null
  created_at: string
}

export type AdminOverviewPromotion = {
  id: number
  slug: string
  title: string
  starts_at: string | null
  ends_at: string | null
}

export type AdminOverview = {
  published_dessert_count: number
  hidden_unpublished_dessert_count: number
  new_inquiry_count: number
  recent_inquiries: AdminOverviewInquiry[]
  active_promotion_count: number
  active_promotions: AdminOverviewPromotion[]
}

export type ReorderItem = {
  id: number
  sort_order: number
}

type Fetcher = typeof fetch

export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown, fallback: string) {
    super(typeof detail === 'string' ? detail : fallback)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    let detail: unknown = text
    try {
      const parsed = JSON.parse(text) as { detail?: unknown }
      detail = parsed.detail ?? parsed
    } catch {
      // Plain text errors are still useful for callers.
    }
    throw new ApiError(response.status, detail, text || `Request failed with ${response.status}`)
  }
  return response.json() as Promise<T>
}

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export async function getPublicCategories(baseUrl: string, fetcher: Fetcher = fetch): Promise<PublicCategory[]> {
  return parseJson(await fetcher(apiUrl(baseUrl, '/public/categories'), { cache: 'no-store' }))
}

export async function getPublicSiteSettings(baseUrl: string, fetcher: Fetcher = fetch): Promise<SiteSettings> {
  return parseJson(await fetcher(apiUrl(baseUrl, '/public/site-settings'), { cache: 'no-store' }))
}

export async function getPublicCatalog(
  baseUrl: string,
  params: { category?: string } = {},
  fetcher: Fetcher = fetch,
): Promise<PublicCatalog> {
  const search = new URLSearchParams()
  if (params.category) {
    search.set('category', params.category)
  }
  const suffix = search.size ? `?${search.toString()}` : ''
  return parseJson(await fetcher(apiUrl(baseUrl, `/public/catalog${suffix}`), { cache: 'no-store' }))
}

export async function getPublicDessert(
  baseUrl: string,
  slug: string,
  fetcher: Fetcher = fetch,
): Promise<PublicDessertDetail> {
  return parseJson(await fetcher(apiUrl(baseUrl, `/public/desserts/${encodeURIComponent(slug)}`), { cache: 'no-store' }))
}

export async function getPublicReviews(
  baseUrl: string,
  params: { dessert_id?: number; featured?: boolean; limit?: number; offset?: number } = {},
  fetcher: Fetcher = fetch,
): Promise<PublicReviewList> {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value))
    }
  }
  return parseJson(await fetcher(apiUrl(baseUrl, `/public/reviews${search.size ? `?${search.toString()}` : ''}`), { cache: 'no-store' }))
}

export async function getPublicPromotions(
  baseUrl: string,
  params: { limit?: number; offset?: number } = {},
  fetcher: Fetcher = fetch,
): Promise<PublicPromotionList> {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value))
    }
  }
  return parseJson(await fetcher(apiUrl(baseUrl, `/public/promotions${search.size ? `?${search.toString()}` : ''}`), { cache: 'no-store' }))
}

export async function getPublicPromotion(
  baseUrl: string,
  slug: string,
  fetcher: Fetcher = fetch,
): Promise<PublicPromotion> {
  return parseJson(await fetcher(apiUrl(baseUrl, `/public/promotions/${encodeURIComponent(slug)}`), { cache: 'no-store' }))
}

export async function submitPublicInquiry(
  baseUrl: string,
  payload: PublicInquiryInput,
  fetcher: Fetcher = fetch,
): Promise<PublicInquiryAcknowledgement> {
  return parseJson(
    await fetcher(apiUrl(baseUrl, '/public/inquiries'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
}

export class AdminApi {
  private readonly baseUrl: string
  private readonly fetcher: Fetcher

  constructor(baseUrl: string, fetcher: Fetcher = fetch) {
    this.baseUrl = baseUrl
    this.fetcher = fetcher
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return parseJson<T>(
      await this.fetcher(apiUrl(this.baseUrl, path), {
        ...init,
        credentials: 'include',
        headers: {
          ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
          ...init.headers,
        },
      }),
    )
  }

  async mutate<T>(path: string, init: RequestInit = {}): Promise<T> {
    const csrf = await this.request<{ csrf_token: string }>('/admin/auth/csrf')
    return this.request<T>(path, {
      ...init,
      headers: { 'x-csrf-token': csrf.csrf_token, ...init.headers },
    })
  }

  me(): Promise<AdminUser> {
    return this.request('/admin/auth/me')
  }

  login(email: FormDataEntryValue | null, password: FormDataEntryValue | null): Promise<AdminUser> {
    return this.request('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  logout(): Promise<{ status: string }> {
    return this.mutate('/admin/auth/logout', { method: 'POST' })
  }

  categories(): Promise<AdminCategory[]> {
    return this.request('/admin/categories')
  }

  siteSettings(): Promise<SiteSettings> {
    return this.request('/admin/site-settings')
  }

  updateSiteSettings(payload: Partial<SiteSettings>): Promise<SiteSettings> {
    return this.mutate('/admin/site-settings', { method: 'PATCH', body: JSON.stringify(payload) })
  }

  overview(): Promise<AdminOverview> {
    return this.request('/admin/overview')
  }

  inquiries(filters: AdminInquiryFilters = {}): Promise<AdminInquiryList> {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value))
      }
    }
    return this.request(`/admin/inquiries${search.size ? `?${search.toString()}` : ''}`)
  }

  inquiry(id: number): Promise<AdminInquiry> {
    return this.request(`/admin/inquiries/${id}`)
  }

  updateInquiryNotes(id: number, internalNotes: string): Promise<AdminInquiry> {
    return this.mutate(`/admin/inquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ internal_notes: internalNotes }),
    })
  }

  transitionInquiry(id: number, targetStatus: InquiryStatus): Promise<AdminInquiry> {
    return this.mutate(`/admin/inquiries/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ target_status: targetStatus }),
    })
  }

  createCategory(payload: Partial<AdminCategory>): Promise<AdminCategory> {
    return this.mutate('/admin/categories', { method: 'POST', body: JSON.stringify(payload) })
  }

  updateCategory(id: number, payload: Partial<AdminCategory>): Promise<AdminCategory> {
    return this.mutate(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }

  archiveCategory(id: number): Promise<AdminCategory> {
    return this.mutate(`/admin/categories/${id}/archive`, { method: 'POST' })
  }

  desserts(): Promise<AdminDessert[]> {
    return this.request('/admin/desserts')
  }

  reviews(includeArchived = false): Promise<AdminReview[]> {
    return this.request(`/admin/reviews${includeArchived ? '?include_archived=true' : ''}`)
  }

  review(id: number): Promise<AdminReview> {
    return this.request(`/admin/reviews/${id}`)
  }

  createReview(payload: Partial<AdminReview>): Promise<AdminReview> {
    return this.mutate('/admin/reviews', { method: 'POST', body: JSON.stringify(payload) })
  }

  updateReview(id: number, payload: Partial<AdminReview>): Promise<AdminReview> {
    return this.mutate(`/admin/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }

  publishReview(id: number): Promise<AdminReview> {
    return this.mutate(`/admin/reviews/${id}/publish`, { method: 'POST' })
  }

  unpublishReview(id: number): Promise<AdminReview> {
    return this.mutate(`/admin/reviews/${id}/unpublish`, { method: 'POST' })
  }

  featureReview(id: number): Promise<AdminReview> {
    return this.mutate(`/admin/reviews/${id}/feature`, { method: 'POST' })
  }

  unfeatureReview(id: number): Promise<AdminReview> {
    return this.mutate(`/admin/reviews/${id}/unfeature`, { method: 'POST' })
  }

  reorderReviews(payload: ReorderItem[]): Promise<AdminReview[]> {
    return this.mutate('/admin/reviews/reorder', { method: 'POST', body: JSON.stringify(payload) })
  }

  archiveReview(id: number): Promise<AdminReview> {
    return this.mutate(`/admin/reviews/${id}/archive`, { method: 'POST' })
  }

  promotions(includeArchived = false): Promise<AdminPromotion[]> {
    return this.request(`/admin/promotions${includeArchived ? '?include_archived=true' : ''}`)
  }

  promotion(id: number): Promise<AdminPromotion> {
    return this.request(`/admin/promotions/${id}`)
  }

  createPromotion(payload: Partial<AdminPromotion>): Promise<AdminPromotion> {
    return this.mutate('/admin/promotions', { method: 'POST', body: JSON.stringify(payload) })
  }

  updatePromotion(id: number, payload: Partial<AdminPromotion>): Promise<AdminPromotion> {
    return this.mutate(`/admin/promotions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }

  publishPromotion(id: number): Promise<AdminPromotion> {
    return this.mutate(`/admin/promotions/${id}/publish`, { method: 'POST' })
  }

  unpublishPromotion(id: number): Promise<AdminPromotion> {
    return this.mutate(`/admin/promotions/${id}/unpublish`, { method: 'POST' })
  }

  reorderPromotions(payload: ReorderItem[]): Promise<AdminPromotion[]> {
    return this.mutate('/admin/promotions/reorder', { method: 'POST', body: JSON.stringify(payload) })
  }

  archivePromotion(id: number): Promise<AdminPromotion> {
    return this.mutate(`/admin/promotions/${id}/archive`, { method: 'POST' })
  }

  createDessert(payload: Partial<AdminDessert>): Promise<AdminDessert> {
    return this.mutate('/admin/desserts', { method: 'POST', body: JSON.stringify(payload) })
  }

  updateDessert(id: number, payload: Partial<AdminDessert>): Promise<AdminDessert> {
    return this.mutate(`/admin/desserts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  }

  archiveDessert(id: number): Promise<AdminDessert> {
    return this.mutate(`/admin/desserts/${id}/archive`, { method: 'POST' })
  }

  reorderDesserts(payload: ReorderItem[]): Promise<AdminDessert[]> {
    return this.mutate('/admin/desserts/reorder', { method: 'POST', body: JSON.stringify(payload) })
  }

  createVariant(dessertId: number, payload: Partial<DessertVariant>): Promise<AdminDessert> {
    return this.mutate(`/admin/desserts/${dessertId}/variants`, { method: 'POST', body: JSON.stringify(payload) })
  }

  archiveVariant(dessertId: number, variantId: number): Promise<AdminDessert> {
    return this.mutate(`/admin/desserts/${dessertId}/variants/${variantId}/archive`, { method: 'POST' })
  }

  reorderVariants(dessertId: number, payload: ReorderItem[]): Promise<AdminDessert> {
    return this.mutate(`/admin/desserts/${dessertId}/variants/reorder`, { method: 'POST', body: JSON.stringify(payload) })
  }

  uploadImage(dessertId: number, form: FormData): Promise<AdminDessert> {
    return this.mutate(`/admin/desserts/${dessertId}/images`, { method: 'POST', body: form })
  }

  setPrimaryImage(dessertId: number, imageId: number): Promise<AdminDessert> {
    return this.mutate(`/admin/desserts/${dessertId}/images/${imageId}/primary`, { method: 'POST' })
  }

  deleteImage(dessertId: number, imageId: number): Promise<AdminDessert> {
    return this.mutate(`/admin/desserts/${dessertId}/images/${imageId}`, { method: 'DELETE' })
  }

  reorderImages(dessertId: number, payload: ReorderItem[]): Promise<AdminDessert> {
    return this.mutate(`/admin/desserts/${dessertId}/images/reorder`, { method: 'POST', body: JSON.stringify(payload) })
  }
}
