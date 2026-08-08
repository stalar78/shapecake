"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ApiError,
  submitPublicInquiry,
  type DessertVariant,
  type FulfillmentMethod,
  type PreferredContactChannel,
  type PublicCategory,
  type PublicDessertSummary,
} from "@cake-and-shape/api-client";

type InquiryFormProps = {
  apiBaseUrl: string;
  categories?: PublicCategory[];
  desserts?: PublicDessertSummary[];
  dessert?: { id: number; name: string; variants?: DessertVariant[] } | null;
};

export function InquiryForm({ apiBaseUrl, categories = [], desserts = [], dessert = null }: InquiryFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [selectedDessertId, setSelectedDessertId] = useState(dessert?.id ?? 0);
  const [selectedVariantId, setSelectedVariantId] = useState(0);
  const selectedDessert = dessert ?? desserts.find((item) => item.id === selectedDessertId) ?? null;
  const availableVariants = selectedDessert?.variants?.filter((variant) => variant.is_available) ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const quantity = String(form.get("quantity") ?? "").trim();
    const dessertValue = dessert?.id ?? selectedDessertId;
    const variantValue = availableVariants.some((variant) => variant.id === selectedVariantId) ? selectedVariantId : 0;
    const phone = optionalString(form.get("phone"));
    const email = optionalString(form.get("email"));
    const preferred = String(form.get("preferred_contact_channel") ?? "email") as PreferredContactChannel;
    const fulfillment = String(form.get("fulfillment_method") ?? "pickup") as FulfillmentMethod;
    const requestedDate = optionalString(form.get("requested_date"));
    setStatus("loading");
    setMessage("");
    setReference("");
    if (!phone && !email) {
      setStatus("error");
      setMessage("Укажите хотя бы один способ связи.");
      return;
    }
    if (preferred === "email" && !email) {
      setStatus("error");
      setMessage("Укажите email или выберите способ связи по телефону.");
      return;
    }
    if (preferred !== "email" && !phone) {
      setStatus("error");
      setMessage("Для выбранного способа связи нужен телефон.");
      return;
    }
    if (requestedDate && requestedDate < new Date().toISOString().slice(0, 10)) {
      setStatus("error");
      setMessage("Дата не может быть в прошлом.");
      return;
    }
    try {
      const response = await submitPublicInquiry(apiBaseUrl, {
        customer_name: String(form.get("customer_name") ?? ""),
        phone,
        email,
        preferred_contact_channel: preferred,
        dessert_id: dessertValue > 0 ? dessertValue : null,
        variant_id: variantValue > 0 ? variantValue : null,
        fulfillment_method: fulfillment,
        requested_date: requestedDate,
        quantity: quantity ? Number(quantity) : null,
        recipe_preferences: String(form.get("recipe_preferences") ?? ""),
        decor_preferences: String(form.get("decor_preferences") ?? ""),
        message: String(form.get("message") ?? ""),
        consent_personal_data: form.get("consent_personal_data") === "on",
      });
      setStatus("success");
      setReference(response.public_reference);
      event.currentTarget.reset();
      setSelectedVariantId(0);
      if (!dessert) {
        setSelectedDessertId(0);
      }
    } catch (error) {
      setStatus("error");
      setMessage(humanError(error));
    }
  }

  return (
    <section className="editorial-card bg-[var(--surface-strong)] p-5 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="eyebrow">Запрос на десерт</p>
          <h2 className="display mt-3 text-5xl font-semibold leading-none">Расскажите о вашем десерте</h2>
          <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
            Это не корзина и не оплата. Мы получим запрос, уточним детали и свяжемся с вами удобным способом.
          </p>
          {dessert ? <p className="mt-5 border-t border-[var(--line)] pt-5 text-sm font-bold">Выбран десерт: {dessert.name}</p> : null}
        </div>

        <form className="grid gap-8" onSubmit={handleSubmit}>
          <FormBlock number="01" title="Что готовим">
            {!dessert ? (
              <label className="field">
                <span className="field-label">Десерт</span>
                <select
                  className="field-control"
                  name="dessert_id"
                  value={selectedDessertId || ""}
                  onChange={(event) => {
                    setSelectedDessertId(Number(event.currentTarget.value || 0));
                    setSelectedVariantId(0);
                  }}
                >
                  <option value="">Можно не выбирать</option>
                  {categories.length ? <option disabled>Опубликованные десерты</option> : null}
                  {desserts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field">
              <span className="field-label">Вес / вариант</span>
              <select
                className="field-control"
                name="variant_id"
                value={selectedVariantId || ""}
                onChange={(event) => setSelectedVariantId(Number(event.currentTarget.value || 0))}
              >
                <option value="">Уточним позже</option>
                {availableVariants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.weight_value} {variant.weight_unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Количество / порции</span>
              <input className="field-control" name="quantity" type="number" min="1" max="10000" placeholder="Например, 12" />
            </label>
          </FormBlock>

          <FormBlock number="02" title="Когда и как получить">
            <label className="field">
              <span className="field-label">Желаемая дата</span>
              <input className="field-control" name="requested_date" type="date" />
            </label>
            <label className="field">
              <span className="field-label">Формат получения</span>
              <select className="field-control" name="fulfillment_method" defaultValue="pickup" required>
                <option value="pickup">Самовывоз</option>
                <option value="delivery">Доставка</option>
              </select>
            </label>
          </FormBlock>

          <FormBlock number="03" title="Пожелания">
            <label className="field">
              <span className="field-label">Вкус / рецепт</span>
              <textarea className="field-control min-h-28" name="recipe_preferences" maxLength={2000} placeholder="Начинка, сладость, ограничения" />
            </label>
            <label className="field">
              <span className="field-label">Декор</span>
              <textarea className="field-control min-h-28" name="decor_preferences" maxLength={2000} placeholder="Цвета, настроение, надпись" />
            </label>
            <label className="field md:col-span-2">
              <span className="field-label">Главное сообщение</span>
              <textarea className="field-control min-h-36" name="message" placeholder="Опишите повод и любые важные детали" required />
            </label>
          </FormBlock>

          <FormBlock number="04" title="Как связаться">
            <label className="field">
              <span className="field-label">Имя</span>
              <input className="field-control" name="customer_name" required />
            </label>
            <label className="field">
              <span className="field-label">Телефон</span>
              <input className="field-control" name="phone" />
            </label>
            <label className="field">
              <span className="field-label">Электронная почта</span>
              <input className="field-control" name="email" type="email" />
            </label>
            <label className="field">
              <span className="field-label">Предпочтительный канал</span>
              <select className="field-control" name="preferred_contact_channel" defaultValue="email">
                <option value="email">Email</option>
                <option value="phone">Телефон</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
              </select>
            </label>
            <label className="flex gap-3 text-sm leading-6 text-[var(--muted)] md:col-span-2">
              <input className="mt-1 size-4 accent-[var(--primary)]" name="consent_personal_data" type="checkbox" required />
              <span>Я согласен(на) на обработку персональных данных, чтобы Cake &amp; Shape ответили на запрос.</span>
            </label>
          </FormBlock>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button className="button-primary disabled:opacity-60" disabled={status === "loading"} type="submit">
              {status === "loading" ? "Отправляем..." : "Отправить запрос"}
            </button>
            {status === "success" ? (
              <p className="border-l-2 border-emerald-700 pl-4 text-sm text-emerald-900">
                Запрос получен. Ваш номер: <strong>{reference}</strong>
              </p>
            ) : null}
            {status === "error" ? <p className="border-l-2 border-[var(--primary)] pl-4 text-sm text-[var(--primary-strong)]">{message}</p> : null}
          </div>
        </form>
      </div>
    </section>
  );
}

function FormBlock({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-[var(--line)] pt-5 md:grid-cols-2">
      <legend className="display mb-3 text-3xl font-semibold">
        <span className="mr-3 text-base font-bold text-[var(--primary-strong)]">{number}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function humanError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return "Похожий запрос уже получен недавно. Пожалуйста, подождите перед повторной отправкой.";
    if (error.status === 429) return "Слишком много попыток. Попробуйте отправить запрос чуть позже.";
    if (error.status === 422) return "Проверьте поля формы и согласие на обработку данных.";
  }
  return "Не удалось отправить запрос. Пожалуйста, попробуйте еще раз.";
}
