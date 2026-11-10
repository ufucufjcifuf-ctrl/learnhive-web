import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// 🔥 ভার্সেল এজ নেটওয়ার্কে ০ মিলিসেকেন্ডে ফাস্ট সোশ্যাল ইমেজ জেনারেটর
export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "Learn Hive Online Portal";
    const questions = searchParams.get("q") || "25";
    const timeParam = searchParams.get("t") || "20";

    // 🔥 ফোল্ডার হলে '📁 Study Folder' ও '📚 Items' দেখাবে, এক্সাম হলে '⏱️ Minutes' ও '📝 Questions' দেখাবে
    const isFolder = timeParam.toLowerCase() === "folder";
    const timeBadgeText = isFolder ? "📁 Study Folder" : `⏱️ ${timeParam} Minutes`;
    const countBadgeText = isFolder ? `📚 ${questions} Items` : `📝 ${questions} Questions`;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0A0A0E",
            border: "16px solid #00F0FF",
            padding: "40px",
            fontFamily: "sans-serif",
          }}
        >
          {/* Logo / Brand Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "35px" }}>
            <div
              style={{
                width: "75px",
                height: "75px",
                borderRadius: "22px",
                background: "linear-gradient(to top right, #00F0FF, #0080FF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: "42px",
                fontWeight: "900",
              }}
            >
              H
            </div>
            <span style={{ fontSize: "45px", color: "#FFFFFF", fontWeight: "900", letterSpacing: "2px" }}>
              LEARN HIVE
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "54px",
              fontWeight: "900",
              color: "#FFFFFF",
              textAlign: "center",
              lineHeight: "1.25",
              marginBottom: "40px",
              padding: "0 30px",
            }}
          >
            {title}
          </h1>

          {/* Badges */}
          <div style={{ display: "flex", gap: "25px", marginBottom: "30px" }}>
            <div
              style={{
                display: "flex",
                background: "#121218",
                padding: "16px 36px",
                borderRadius: "100px",
                border: "2px solid rgba(0, 240, 255, 0.4)",
              }}
            >
              <span style={{ fontSize: "28px", color: "#00F0FF", fontWeight: "bold" }}>
                {countBadgeText}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                background: "#121218",
                padding: "16px 36px",
                borderRadius: "100px",
                border: "2px solid rgba(255, 215, 0, 0.4)",
              }}
            >
              <span style={{ fontSize: "28px", color: "#FFD700", fontWeight: "bold" }}>
                {timeBadgeText}
              </span>
            </div>
          </div>

          {/* Call to action */}
          <div style={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
            <span style={{ fontSize: "24px", color: "#A0A0A0", fontWeight: "bold" }}>
              Online Model Test & Study Platform • Android App & Web 🚀
            </span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e: any) {
    return new Response("Failed to generate image", { status: 500 });
  }
}