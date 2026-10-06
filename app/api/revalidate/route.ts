import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  // সিক্রেট টোকেন (নিরাপত্তার জন্য)
  const expectedSecret = process.env.REVALIDATION_SECRET_TOKEN || "learnhive_secret_2026";

  if (secret !== expectedSecret) {
    return NextResponse.json({ message: "Invalid secret token" }, { status: 401 });
  }

  try {
    // সম্পূর্ণ ওয়েবসাইটের প্রি-বিল্ট ক্যাশ সাথে সাথে ক্লিয়ার করে নতুন করে তৈরি করবে
    revalidatePath("/", "layout");
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}