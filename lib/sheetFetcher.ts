import { Question } from "@/types";

export async function fetchGoogleSheetQuestions(
  sheetId: string,
  tabName: string = "Sheet1"
): Promise<Question[]> {
  try {
    const cleanSheetId = sheetId.trim();
    const cleanTab = tabName.trim() || "Sheet1";
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(cleanTab)}`;
    
    const response = await fetch(gvizUrl, { next: { revalidate: 300 } });

    if (!response.ok) {
      throw new Error(`Google Sheets fetch failed: HTTP ${response.status}`);
    }

    const rawString = await response.text();
    const startIndex = rawString.indexOf("{");
    const endIndex = rawString.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
      throw new Error("Invalid Google Sheet response format.");
    }

    const jsonString = rawString.substring(startIndex, endIndex + 1);
    const gvizData = JSON.parse(jsonString);

    const rows = gvizData.table?.rows || [];
    const questions: Question[] = [];

    const isHeaderRow = (firstCell: string, secondCell: string) => {
      const headers = ["question", "প্রশ্ন", "q", "text", "serial", "sl no", "নং", "sl"];
      return headers.includes(firstCell.toLowerCase()) || secondCell.toLowerCase().startsWith("option");
    };

    rows.forEach((row: any, i: number) => {
      const cells = row.c || [];
      const safeGet = (idx: number) => cells[idx]?.v?.toString().trim() || "";

      const qText = safeGet(0);
      const optA = safeGet(1);

      // ফাঁকা বা হেডার রো স্কিপ করা
      if (!qText || isHeaderRow(qText, optA)) return;

      const optB = safeGet(2);
      const optC = safeGet(3);
      const optD = safeGet(4);
      const col5Val = safeGet(5);

      // কমপক্ষে ২টি অপশন না থাকলে ক্রুটিপূর্ণ প্রশ্ন হিসেবে বাদ দেওয়া
      if (!optA || !optB) return;

      let optE: string | null = null;
      let correctAnsStr = "";
      let explanation = "";
      let difficulty: Question["difficulty"] = "NONE";
      let customPos: number | null = null;
      let customNeg: number | null = null;

      const answerRegex = /^([A-Ea-e](\s*,\s*[A-Ea-e])*)$/;

      if (col5Val && !answerRegex.test(col5Val)) {
        optE = col5Val;
        correctAnsStr = safeGet(6).toUpperCase();
        explanation = safeGet(7);
        const diffRaw = safeGet(8).toUpperCase();
        difficulty = (["A", "B", "C", "D"].includes(diffRaw) ? diffRaw : "NONE") as Question["difficulty"];
        customPos = parseFloat(safeGet(9)) || null;
        customNeg = parseFloat(safeGet(10)) || null;
      } else {
        correctAnsStr = col5Val.toUpperCase();
        explanation = safeGet(6);
        const diffRaw = safeGet(7).toUpperCase();
        difficulty = (["A", "B", "C", "D"].includes(diffRaw) ? diffRaw : "NONE") as Question["difficulty"];
        customPos = parseFloat(safeGet(8)) || null;
        customNeg = parseFloat(safeGet(9)) || null;
      }

      const options = [optA, optB];
      if (optC) options.push(optC);
      if (optD) options.push(optD);
      if (optE) options.push(optE);

      const correctIndices: number[] = [];
      if (correctAnsStr) {
        correctAnsStr.split(",").forEach((part) => {
          const char = part.trim();
          let idx = -1;
          if (char === "A") idx = 0;
          else if (char === "B") idx = 1;
          else if (char === "C") idx = 2;
          else if (char === "D") idx = 3;
          else if (char === "E") idx = 4;

          // নিশ্চিত করা যাতে ইনডেক্সটি অপশনের পরিমাণের ভেতর থাকে
          if (idx !== -1 && idx < options.length) {
            correctIndices.push(idx);
          }
        });
      }

      questions.push({
        id: `${cleanSheetId}_q_${i}`,
        text: qText,
        options,
        correctOptionIndex: correctIndices.length > 0 ? correctIndices[0] : -1,
        correctOptionIndices: correctIndices,
        explanation,
        customPositiveMark: customPos,
        customNegativeMark: customNeg,
        difficulty,
        timestamp: Date.now(),
      });
    });

    return questions;
  } catch (error: any) {
    console.error("Sheet Fetch Error:", error);
    throw new Error(error.message || "Failed to load sheet questions.");
  }
}