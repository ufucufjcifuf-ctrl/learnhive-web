"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { School, Trophy, Headset, User } from "lucide-react";

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();

  // পরীক্ষা দেওয়া বা রিভিউর সময় বটম বার বন্ধ থাকবে
  if (
    pathname.startsWith("/exam/") ||
    pathname.startsWith("/result") ||
    pathname.startsWith("/review/") ||
    pathname.startsWith("/video/") ||
    pathname.startsWith("/adaptive/")
  ) {
    return null;
  }

  const navItems = [
    { href: "/", label: "হোম", icon: School },
    { href: "/leaderboard", label: "মেধা তালিকা", icon: Trophy },
    { href: "/contact", label: "যোগাযোগ", icon: Headset },
    { href: "/profile", label: "প্রোফাইল", icon: User },
  ];

  return (
    <div className="lg:hidden fixed bottom-3 left-4 right-4 z-40">
      <nav className="h-15 bg-[#121218]/90 backdrop-blur-xl border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-500/10 flex justify-around items-center px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all duration-200 ${
                isActive ? "text-cyan-400 scale-105" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <IconComponent size={22} className={isActive ? "text-cyan-400" : "text-gray-400"} />
              <span className={`text-[10px] font-bold mt-1 ${isActive ? "text-cyan-400" : "text-gray-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};