import { testEmail, testPhone } from './test-fixtures.mjs';
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { createClient } from "@supabase/supabase-js";
import { chromium,expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { startNextServer } from "./preview.mjs";
loadEnvConfig(process.cwd());
const {server,origin}=await startNextServer();const browser=await chromium.launch();let testOrder=null;
const db=process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY?createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}}):null;
try{
  const page=await browser.newPage({viewport:{width:390,height:850}});
  await page.goto(origin+"/admin/");await expect(page).toHaveURL(/\/admin\/login\//);await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content",/noindex/);
  for(const route of ["/admin/products/","/admin/products/new/","/admin/categories/","/admin/orders/","/admin/discounts/","/admin/subscribers/","/admin/messages/","/admin/settings/"]){await page.goto(origin+route);await expect(page).toHaveURL(/\/admin\/login\//);}
  const exportResponse=await page.request.get(origin+"/api/admin/export?type=orders");expect(exportResponse.status()).toBe(403);
  const uploadResponse=await page.request.post(origin+"/api/admin/upload-sign",{data:{name:"x",width:400},headers:{Origin:origin}});expect(uploadResponse.status()).toBe(403);
  console.log("PASS unauthenticated owner pages, export and upload blocked");
  if(!db||!process.env.ADMIN_EMAIL||!process.env.ADMIN_TEST_PASSWORD){console.log("SKIP connected admin edit/status smoke: add local-only ADMIN_TEST_PASSWORD after the Supabase SQL and seed are complete.");}
  else{
    await page.locator('input[name="email"]').fill(process.env.ADMIN_EMAIL);await page.locator('input[name="password"]').fill(process.env.ADMIN_TEST_PASSWORD);await page.getByRole("button",{name:"Sign in"}).click();await expect(page).toHaveURL(/\/admin\/$/);await expect(page.locator("h1")).toHaveText("Owner area");
    await page.goto(origin+"/admin/products/");await page.locator("tbody a").first().click();const original=await page.locator('input').filter({hasNot:page.locator("[type=hidden]")}).count();expect(original).toBeGreaterThan(0);const technique=page.getByLabel("Technique");const previous=await technique.inputValue();await technique.fill(previous+" · test");await page.getByRole("button",{name:"Save product"}).click();await expect(page.getByRole("status")).toContainText("Saved");await technique.fill(previous);await page.getByRole("button",{name:"Save product"}).click();await expect(page.getByRole("status")).toContainText("Saved");console.log("PASS product edit and restore");
    const number="LB-"+Array.from({length:8},()=>"23456789ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random()*31)]).join("");
    const created=await db.from("orders").insert({number,checkout_token:randomUUID(),status:"paid",customer_name:"Admin Test",email:testEmail('admin-test'),phone:testPhone(),address:{line1:"Test",city:"Srinagar",state:"Jammu and Kashmir",pin:"190001"},subtotal_paise:100,discount_paise:0,shipping_paise:0,total_paise:100,paid_at:new Date().toISOString(),is_test:true}).select("id").single();if(created.error)throw new Error("Could not create a disposable test order");testOrder=created.data.id;
    await page.goto(origin+`/admin/orders/${testOrder}/`);await page.getByRole("button",{name:"Mark packed"}).click();await expect(page.locator(".admin-badge").first()).toContainText("packed");const {data:updated}=await db.from("orders").select("status").eq("id",testOrder).single();expect(updated?.status).toBe("packed");console.log("PASS order status change");
  }
}finally{if(testOrder&&db)await db.from("orders").delete().eq("id",testOrder);await browser.close();server.close();}
