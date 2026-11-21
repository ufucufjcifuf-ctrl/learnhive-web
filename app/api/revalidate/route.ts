import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.REVALIDATION_SECRET_TOKEN?.trim();
  if (!expectedSecret) {
    return NextResponse.json(
      { message: "REVALIDATION_SECRET_TOKEN is not configured on server" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token || token !== expectedSecret) {
    return NextResponse.json({ message: "Unauthorized revalidation request" }, { status: 401 });
  }

  try {
    revalidateTag("layout", { expire: 0 });
    revalidateTag("exams", { expire: 0 });
    revalidatePath("/", "layout");
    revalidatePath("/sitemap.xml");

    return NextResponse.json({
      revalidated: true,
      timestamp: Date.now(),
      message: "Cache successfully purged across all routes, tags, and layout tree.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Revalidation failed" },
      { status: 500 }
    );
  }
}