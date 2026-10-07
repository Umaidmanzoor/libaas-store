import { z } from "zod";
import { commerce } from "../../content/commerce";
export const selectionSchema=z.object({
  items:z.array(z.object({variant_id:z.uuid(),qty:z.number().int().min(1).max(10)})).min(1).max(50),
  code:z.string().trim().toUpperCase().max(40).regex(/^[A-Z0-9_-]*$/).default(""),
});
export const customerSchema=z.object({
  name:z.string().trim().min(2).max(80),email:z.email().max(254),mobile:z.string().regex(/^[6-9]\d{9}$/),
  address:z.object({line1:z.string().trim().min(8).max(250),line2:z.string().trim().max(250).default(""),city:z.string().trim().min(2).max(80),state:z.string().refine(s=>commerce.states.includes(s)),pin:z.string().regex(/^[1-9]\d{5}$/)}),
  consent_marketing:z.boolean().default(false),
});
export const checkoutInput=selectionSchema.extend({customer:customerSchema,checkout_token:z.uuid(),expected_total:z.number().int().min(100).max(2147483647),website:z.string().max(0),started_at:z.number().int()});
export type Quote={items:{variant_id:string;name:string;size:string;colour:string;qty:number;unit_price_paise:number;available:number}[];subtotal_paise:number;discount_paise:number;shipping_paise:number;total_paise:number};
