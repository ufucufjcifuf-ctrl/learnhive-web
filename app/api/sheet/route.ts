import { NextRequest, NextResponse } from "next/server";
import { fetchGoogleSheetQuestions } from "@/lib/sheetFetcher";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let rawSheetId = searchParams.get("sheetId") || "";
  let tabName = searchParams.get("tab") || "Sheet1";

  if (!rawSheetId) {
    return NextResponse.json({ error: "Sheet ID is required" }, { status: 400 });
  }

  rawSheetId = decodeURIComponent(rawSheetId).trim();

  if (rawSheetId.includes("|LIMIT|")) {
    rawSheetId = rawSheetId.split("|LIMIT|")[0].trim();
  }

  let sheetId = rawSheetId;
  if (rawSheetId.includes(":")) {
    const parts = rawSheetId.split(":");
    sheetId = parts[0].trim();
    if (!searchParams.get("tab") || searchParams.get("tab") === "Sheet1") {
      tabName = parts[1]?.trim() || tabName;
    }
  }

  // Strict SSRF protection
  if (!/^[a-zA-Z0-9_-]+$/.test(sheetId)) {
    return NextResponse.json({ error: "Invalid Google Sheet ID format" }, { status: 400 });
  }

  try {
    const questions = await fetchGoogleSheetQuestions(sheetId, tabName);
    return NextResponse.json({ success: true, count: questions.length, data: questions });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}