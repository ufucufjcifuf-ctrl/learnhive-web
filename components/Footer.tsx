"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, HelpCircle, FileText, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto border-t border-white/5 bg-[#0C0C10] py-8 px-4 md:px-8 text-xs text-gray-400">
      <div className="max-w-[750px] mx-auto flex flex-col items-center gap-4 text-center">
        
        {/* কুইক লিংক সমূহ */}
        <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold">
          <Link href="/privacy" className="hover:text-cyan-400 transition flex items-center gap-1">
            <ShieldCheck size={13} /> প্রাইভেসি পলিসি
          </Link>
          <Link href="/rules" className="hover:text-amber-400 transition flex items-center gap-1">
            <FileText size={13} /> পরীক্ষার নিয়মাবলী
          </Link>
          <Link href="/contact" className="hover:text-cyan-400 transition flex items-center gap-1">
            <HelpCircle size={13} /> যোগাযোগ ও সাপোর্ট
          </Link>
        </div>

        {/* কপিরাইট */}
        <p className="text-[11px] text-gray-500">
          © {new Date().getFullYear()} <b className="text-gray-300">Learn Hive</b>. সর্বস্বত্ব সংরক্ষিত।
        </p>

        <p className="text-[10px] text-gray-600 flex items-center gap-1">
          Made with <Heart size={10} className="text-red-500 fill-red-500" /> for ambitious students in Bangladesh.
        </p>
      </div>
    </footer>
  );
};