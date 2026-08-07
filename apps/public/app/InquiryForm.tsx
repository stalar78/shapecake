"use client";

import { useState } from "react";
import type { FormEvent } from "react";
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
      setMessage("Please provide at least one contact method.");
      return;
    }
    if (preferred === "email" && !email) {
      setStatus("error");
      setMessage("Please provide an email address or choose a phone-based contact channel.");
      return;
    }
    if (preferred !== "email" && !phone) {
      setStatus("error");
      setMessage("Please provide a phone number for the selected contact channel.");
      return;
    }
    if (requestedDate && requestedDate < new Date().toISOString().slice(0, 10)) {
      setStatus("error");
      setMessage("Requested date cannot be in the past.");
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
    } catch (error) {
      setStatus("error");
      setMessage(humanError(error));
    }
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Inquiry</p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">Request a cake</h2>
      {dessert ? <p className="mt-2 text-sm text-stone-600">Dessert reference: {dessert.name}</p> : null}

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <input className="rounded-2xl border border-stone-300 px-4 py-3" name="customer_name" placeholder="Your name" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="rounded-2xl border border-stone-300 px-4 py-3" name="phone" placeholder="Phone" />
          <input className="rounded-2xl border border-stone-300 px-4 py-3" name="email" type="email" placeholder="Email" />
        </div>
        <select className="rounded-2xl border border-stone-300 px-4 py-3" name="preferred_contact_channel" defaultValue="email">
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="telegram">Telegram</option>
        </select>
        {!dessert ? (
          <select
            className="rounded-2xl border border-stone-300 px-4 py-3"
            name="dessert_id"
            defaultValue=""
            onChange={(event) => {
              setSelectedDessertId(Number(event.currentTarget.value || 0));
              setSelectedVariantId(0);
            }}
          >
            <option value="">No dessert selected</option>
            {categories.length ? <option disabled>Published desserts</option> : null}
            {desserts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          className="rounded-2xl border border-stone-300 px-4 py-3"
          name="variant_id"
          value={selectedVariantId || ""}
          onChange={(event) => setSelectedVariantId(Number(event.currentTarget.value || 0))}
        >
          <option value="">No weight selected</option>
          {availableVariants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.weight_value} {variant.weight_unit}
            </option>
          ))}
        </select>
        <select className="rounded-2xl border border-stone-300 px-4 py-3" name="fulfillment_method" defaultValue="pickup" required>
          <option value="pickup">Pickup</option>
          <option value="delivery">Delivery</option>
        </select>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="rounded-2xl border border-stone-300 px-4 py-3" name="requested_date" type="date" />
          <input className="rounded-2xl border border-stone-300 px-4 py-3" name="quantity" type="number" min="1" max="10000" placeholder="Servings / units" />
        </div>
        <textarea className="min-h-24 rounded-2xl border border-stone-300 px-4 py-3" name="recipe_preferences" maxLength={2000} placeholder="Recipe preferences, if any" />
        <textarea className="min-h-24 rounded-2xl border border-stone-300 px-4 py-3" name="decor_preferences" maxLength={2000} placeholder="Decor preferences, if any" />
        <textarea className="min-h-32 rounded-2xl border border-stone-300 px-4 py-3" name="message" placeholder="Tell us what you need" required />
        <label className="flex gap-3 text-sm text-stone-700">
          <input name="consent_personal_data" type="checkbox" required />
          I consent to Cake & Shape processing my personal data to respond to this inquiry.
        </label>
        <button className="rounded-full bg-stone-950 px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={status === "loading"} type="submit">
          {status === "loading" ? "Sending..." : "Send inquiry"}
        </button>
      </form>

      {status === "success" ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Inquiry received. Your reference is <strong>{reference}</strong>.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{message}</p>
      ) : null}
    </section>
  );
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function humanError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return "We already received this inquiry recently. Please wait before sending it again.";
    if (error.status === 429) return "Too many inquiry attempts. Please try again in a few minutes.";
    if (error.status === 422) return "Please check the highlighted details and consent checkbox.";
  }
  return "We could not send the inquiry. Please try again.";
}
