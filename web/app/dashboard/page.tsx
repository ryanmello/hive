"use client";

import * as React from "react";
import { Hexagon } from "lucide-react";
import { HexagonGrid } from "@/components/hive/hexagon-grid";
import { CategoryDetail } from "@/components/hive/category-detail";
import { SpendingSummary } from "@/components/hive/spending-summary";
import { ChatSidebar } from "@/components/hive/chat-sidebar";
import { mockMonthlySpending, type SpendingCategory } from "@/data/mock-data";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] =
    React.useState<SpendingCategory | null>(null);
  const [chatOpen, setChatOpen] = React.useState(true);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated honeycomb background pattern */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="honeycomb"
              width="56"
              height="100"
              patternUnits="userSpaceOnUse"
              patternTransform="scale(2)"
            >
              <path
                d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <path
                d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#honeycomb)"
            className="text-amber-500"
          />
        </svg>
      </div>

      {/* Ambient gradient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Top left glow */}
        <div
          className="absolute -left-40 -top-40 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%)",
          }}
        />
        {/* Bottom right glow */}
        <div
          className={cn(
            "absolute -bottom-40 h-96 w-96 rounded-full opacity-15 blur-3xl transition-all duration-300",
            chatOpen ? "-right-40" : "-right-40"
          )}
          style={{
            background:
              "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
          }}
        />
        {/* Center subtle glow */}
        <div
          className={cn(
            "absolute top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full opacity-10 blur-3xl transition-all duration-300",
            chatOpen ? "left-[calc(50%-190px)]" : "left-1/2",
            chatOpen ? "-translate-x-1/2" : "-translate-x-1/2"
          )}
          style={{
            background:
              "radial-gradient(circle, rgba(251, 191, 36, 0.5) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Main content - adjusts when chat sidebar is open */}
      <div
        className={cn(
          "relative z-10 transition-all duration-300 ease-out",
          chatOpen ? "pr-[380px]" : "pr-0"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Spending summary header */}
          <SpendingSummary data={mockMonthlySpending} />

          {/* Hexagon grid */}
          <HexagonGrid
            categories={mockMonthlySpending.categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      </div>

      {/* Category detail panel */}
      <CategoryDetail
        category={selectedCategory}
        onClose={() => setSelectedCategory(null)}
        totalSpending={mockMonthlySpending.totalSpent}
      />

      {/* Decorative floating hexagons (subtle) */}
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-0 overflow-hidden transition-all duration-300",
          chatOpen ? "right-[380px]" : "right-0"
        )}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-5"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            <Hexagon
              className="h-16 w-16 text-amber-500/50"
              strokeWidth={1}
            />
          </div>
        ))}
      </div>

      {/* AI Chat Sidebar */}
      <ChatSidebar open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
