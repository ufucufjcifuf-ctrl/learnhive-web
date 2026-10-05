import { Question } from "@/types";

export async function fetchGoogleSheetQuestions(sheetId: string, tabName: string = "Sheet1"): Promise<Question[]> {
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
    const response = await fetch(gvizUrl, { next: { revalidate: 300 } });

    if (!response.ok) {
      throw new Error(`Google Sheets error: HTTP ${response.status}`);
    }

    const rawString = await response.text();
    const startIndex = rawString.indexOf("{");
    const endIndex = rawString.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
      throw new Error("Invalid Google Sheet response format");
    }

    const jsonString = rawString.substring(startIndex, endIndex + 1);
    const gvizData = JSON.parse(jsonString);

    const rows = gvizData.table?.rows || [];
    const questions: Question[] = [];

    const isHeaderRow = (firstCell: string, secondCell: string) => {
      const headers = ["question", "প্রশ্ন", "q", "text", "serial", "sl no", "নং"];
      return headers.includes(firstCell.toLowerCase()) || secondCell.toLowerCase().startsWith("option");
    };

    rows.forEach((row: any, i: number) => {
      const cells = row.c || [];
      const safeGet = (idx: number) => cells[idx]?.v?.toString().trim() || "";

      const qText = safeGet(0);
      const optA = safeGet(1);

      if (!qText || isHeaderRow(qText, optA)) return;

      const optB = safeGet(2);
      const optC = safeGet(3);
      const optD = safeGet(4);
      const col5Val = safeGet(5);

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
        difficulty = (["A", "B", "C", "D"].includes(safeGet(8).toUpperCase()) ? safeGet(8).toUpperCase() : "NONE") as Question["difficulty"];
        customPos = parseFloat(safeGet(9)) || null;
        customNeg = parseFloat(safeGet(10)) || null;
      } else {
        correctAnsStr = col5Val.toUpperCase();
        explanation = safeGet(6);
        difficulty = (["A", "B", "C", "D"].includes(safeGet(7).toUpperCase()) ? safeGet(7).toUpperCase() : "NONE") as Question["difficulty"];
        customPos = parseFloat(safeGet(8)) || null;
        customNeg = parseFloat(safeGet(9)) || null;
      }

      const correctIndices: number[] = [];
      if (correctAnsStr) {
        correctAnsStr.split(",").forEach((part) => {
          const char = part.trim();
          if (char === "A") correctIndices.push(0);
          if (char === "B") correctIndices.push(1);
          if (char === "C") correctIndices.push(2);
          if (char === "D") correctIndices.push(3);
          if (char === "E") correctIndices.push(4);
        });
      }

      const options = [optA, optB, optC, optD];
      if (optE) options.push(optE);

      questions.push({
        id: `${sheetId}_q_${i}`,
        text: qText,
        options,
        correctOptionIndex: correctIndices.length > 0 ? correctIndices[0] : -1,
        correctOptionIndices: correctIndices,
        explanation,
        customPositiveMark: customPos,
        customNegativeMark: customNeg,
        difficulty,
      });
    });

    return questions;
  } catch (error: any) {
    throw new Error(error.message);
  }
}