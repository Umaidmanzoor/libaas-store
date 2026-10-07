import { testEmail, testPhone } from './test-fixtures.mjs';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite({extensions:{pg_trgm}});
try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
  await db.exec((await readFile('supabase/schema.sql','utf8')).replace('create extension if not exists pgcrypto;',''));
  const migration=await readFile('supabase/part5.sql','utf8');await db.exec(migration);await db.exec(migration);
  await db.exec(`insert into public.orders(number,checkout_token,status,customer_name,email,phone,address,subtotal_paise,total_paise,paid_at,created_at)
    select 'LB-'||lpad(translate(to_hex(n),'01abcdef','GHJKLMNP'),8,'Z'),gen_random_uuid(),'paid','Test buyer','${testEmail("buyer")}','${testPhone()}','{}',101,101,now(),now()-interval '60 days' from generate_series(1,1005) n;
    insert into public.order_items(order_id,name,size,colour,unit_price_paise,qty) select id,'Test shawl','S','Natural',101,1 from public.orders;
    insert into public.messages(name,email,message) values('Test buyer','${testEmail("buyer")}','Test message');`);
  await db.exec('set role service_role');
  const get=async()=> (await db.query<{summary:{sums:number[];paid_count:number;chart:{amount:number}[];top:{qty:number}[];waiting:number;unread:number}}>('select public.admin_dashboard() as summary')).rows[0].summary;
  const result=await get();assert.equal(result.paid_count,1005);assert.deepEqual(result.sums,[101505,101505,101505]);assert.equal(result.chart.length,30);assert.equal(result.chart[29].amount,101505);assert.equal(result.top[0].qty,1005);assert.equal(result.waiting,1005);assert.equal(result.unread,1);
  await db.exec("update public.orders set status='refunded' where number=(select min(number) from public.orders)");
  assert.equal((await get()).paid_count,1004);
  await db.exec("update public.orders set paid_at=now()-interval '31 days'");assert.deepEqual((await get()).sums,[0,0,0]);
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(()=>db.query('select public.admin_dashboard()'));}
  console.log('PASS dashboard migration repeatability, 1005-row aggregation, paid-date accounting, refund exclusion, window bounds and RPC access');
}finally{await db.close()}
