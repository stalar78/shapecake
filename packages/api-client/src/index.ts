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

export type AdminUser = {
  id: number
  email: string
}

export type InquiryStatus = 'new' | 'in_progress' | 'waiting_customer' | 'confirmed' | 'completed' | 'cancelled' | 'spam'
export type PreferredContactChannel = 'phone' | 'email' | 'whatsapp' | 'telegram'

export type PublicInquiryInput = {
  customer_name: string
  phone?: string | null
  email?: string | null
  preferred_contact_channel: PreferredContactChannel
  dessert_id?: number | null
  requested_date?: string | null
  quantity?: number | null
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
  dessert: { id: number; name: string; slug: string } | null
  customer_name: string
  phone: string | null
  email: string | null
  preferred_contact_channel: PreferredContactChannel
  requested_date: string | null
  quantity: number | null
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
