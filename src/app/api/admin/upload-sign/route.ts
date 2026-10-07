import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/admin-auth";
import { sameOrigin,rateLimit } from "@/lib/ratelimit";
const input=z.object({name:z.string().max(120),width:z.union([z.literal(400),z.literal(800),z.literal(1600)])});
export async function POST(request:Request){if(!await sameOrigin())return NextResponse.json({message:"Not allowed."},{status:403});const admin=await requireAdmin();if(!admin)return NextResponse.json({message:"Not authorised."},{status:403});if(!await rateLimit("admin-upload",80,60))return NextResponse.json({message:"Please wait."},{status:429});const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({message:"Invalid image."},{status:400});const path=`products/${randomUUID()}/${parsed.data.width}.webp`;const {data,error}=await admin.db.storage.from("product-images").createSignedUploadUrl(path);if(error||!data)return NextResponse.json({message:"Upload unavailable."},{status:503});const {data:publicUrl}=admin.db.storage.from("product-images").getPublicUrl(path);return NextResponse.json({path,url:data.signedUrl,publicUrl:publicUrl.publicUrl},{headers:{"Cache-Control":"no-store"}})}
