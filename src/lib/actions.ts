"use server";
import { z } from "zod";
import { after } from "next/server";
import { createAdminClient } from "./supabase/admin";
import { rateLimit,humanTiming,sameOrigin } from "./ratelimit";
import { contactEmail } from "./email";
import { getStorefront } from "./data";
import { backendConfigured } from "./env";
const newsletterSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address.").max(254),
  website: z.string().max(0),
  started_at: z.coerce.number().int().optional(),
  consent: z.literal(true).optional(),
});
export async function joinNewsletter(data: unknown) {
  const parsed = newsletterSchema.safeParse(data);
  if (!parsed.success)
    return {
      ok: false,
      message:
        "Please enter a valid email address and leave the website field blank.",
    };
  if(!backendConfigured())return {ok:false,message:"Subscriptions are currently unavailable. Your email has not been saved or sent."};
  if(!parsed.data.consent)return {ok:false,message:"Please tick the consent box to join the mailing list."};
  if(!parsed.data.started_at||!humanTiming(parsed.data.started_at)||!await sameOrigin()||!await rateLimit("newsletter",5,60,parsed.data.email))return {ok:false,message:"Please wait a moment and try again."};
  const db=createAdminClient();if(!db)return {ok:false,message:"Sign-up is temporarily unavailable."};
  const email=parsed.data.email.toLowerCase();
  const result=await db.from("subscribers").upsert({email,consent_text:"I agree to receive occasional Libaas emails.",source:"footer"},{onConflict:"email",ignoreDuplicates:true});
  return result.error?{ok:false,message:"Sign-up is temporarily unavailable."}:{ok:true,message:"Thank you for joining. Your address has been saved."};
}

import { getProduct, getSettings } from "./data";
import { commerce } from "../../content/commerce";
const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.email("Enter a valid email address.").max(254),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters.")
    .max(2000),
  website: z.string().max(0, "Leave the website field empty."),
  started_at:z.coerce.number().int().optional(),
});
const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.email("Enter a valid email address.").max(254),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number."),
  address: z.string().trim().min(8, "Enter your street address.").max(250),
  city: z.string().trim().min(2, "Enter your city.").max(80),
  state: z
    .string()
    .refine(
      (value) => commerce.states.includes(value),
      "Choose a state or union territory.",
    ),
  pin: z.string().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN."),
  delivery: z.literal("standard"),
  website: z.string().max(0, "Leave the website field empty."),
});
export type FormResult = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};
function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  );
}
export async function sendContact(data: unknown): Promise<FormResult> {
  const result = contactSchema.safeParse(data);
  if (!result.success)
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      errors: fieldErrors(result.error),
    };
  if((await getStorefront()).configured) {
    if(!result.data.started_at||!humanTiming(result.data.started_at)||!await sameOrigin()||!await rateLimit("contact",5,60,result.data.email))return {ok:false,message:"Please wait a moment and try again."};
    const db=createAdminClient();if(!db)return {ok:false,message:"We could not save your message. Please try again."};
    const saved=await db.from("messages").insert({name:result.data.name,email:result.data.email.toLowerCase(),message:result.data.message}).select("id").single();
    if(saved.error)return {ok:false,message:"We could not save your message. Please try again."};
    after(()=>contactEmail(saved.data.id,result.data.name,result.data.message));
    return {ok:true,message:"Thank you. Your message has been received."};
  }
  return {
    ok: true,
    message:
      "Online enquiries are currently unavailable. Your message has not been saved or sent.",
  };
}
export async function sendEnquiry(data: unknown): Promise<FormResult> {
  return sendContact(data);
}
const cartSchema = z
  .array(
    z.object({
      slug: z.string(),
      size: z.string(),
      color: z.string(),
      quantity: z.number().int().min(1).max(commerce.maxQuantity),
    }),
  )
  .min(1)
  .max(100);
export async function reviewSelection(data: unknown, items: unknown) {
  const form = checkoutSchema.safeParse(data);
  if (!form.success)
    return {
      ok: false as const,
      message: "Please check the highlighted fields.",
      errors: fieldErrors(form.error),
    };
  const cart = cartSchema.safeParse(items);
  if (!cart.success)
    return {
      ok: false as const,
      message:
        "Your bag is empty or invalid. Please review it before continuing.",
    };
  let subtotalPaise = 0;
  for (const item of cart.data) {
    const p = await getProduct(item.slug);
    if (!p || !p.sizes.includes(item.size) || !p.colors.includes(item.color))
      return {
        ok: false as const,
        message:
          "A selected piece is no longer available. Please review your bag.",
      };
    subtotalPaise += (p.pricePaise ?? Math.round(p.price * 100)) * item.quantity;
  }
  const settings = await getSettings();
  const shippingPaise = subtotalPaise >= settings.free_shipping_threshold_paise ? 0 : settings.shipping_fee_paise;
  await new Promise((resolve) => setTimeout(resolve, 350));
  return {
    ok: true as const,
    message: "Online ordering is currently unavailable. No payment or order has been processed.",
    receipt: {
      number: `REF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      subtotal: subtotalPaise / 100,
      shipping: shippingPaise / 100,
      total: (subtotalPaise + shippingPaise) / 100,
      count: cart.data.reduce((sum, item) => sum + item.quantity, 0),
    },
  };
}
