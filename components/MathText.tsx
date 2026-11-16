"use client";

import React from "react";
import katex from "katex";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

interface MathTextProps {
  text: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ text, className = "" }) => {
  if (!text) return null;

  const parts = text.split("%%");

  return (
    <span className={`leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;

        if (index % 2 === 1) {
          try {
            const html = katex.renderToString(part.trim(), {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="inline-block px-1"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <span key={index} className="text-red-500 font-bold">
                [Math Error]
              </span>
            );
          }
        }

        const safeHtml = sanitizeHtml(
          part.replace(/\n/g, "<br/>").replace(/&nbsp;/g, "\u00A0")
        );

        return (
          <span
            key={index}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        );
      })}
    </span>
  );
};