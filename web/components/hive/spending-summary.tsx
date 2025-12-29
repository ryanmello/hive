"use client";

import { Wallet, TrendingUp, PiggyBank, Calendar } from "lucide-react";
import { formatCurrency } from "@/data/mock-data";
import type { MonthlySpending } from "@/data/mock-data";

interface SpendingSummaryProps {
  data: MonthlySpending;
}

export function SpendingSummary({ data }: SpendingSummaryProps) {
  const savingsRate = Math.round(
    ((data.totalIncome - data.totalSpent) / data.totalIncome) * 100
  );
  const saved = data.totalIncome - data.totalSpent;

  const stats = [
    {
      label: "Total Spent",
      value: formatCurrency(data.totalSpent),
      icon: Wallet,
      color: "#F59E0B",
      gradient: "from-amber-500/20 to-orange-500/20",
    },
    {
      label: "Income",
      value: formatCurrency(data.totalIncome),
      icon: TrendingUp,
      color: "#10B981",
      gradient: "from-emerald-500/20 to-green-500/20",
    },
    {
      label: "Saved",
      value: formatCurrency(saved),
      icon: PiggyBank,
      color: "#8B5CF6",
      gradient: "from-violet-500/20 to-purple-500/20",
    },
    {
      label: "Period",
      value: `${data.month} ${data.year}`,
      icon: Calendar,
      color: "#3B82F6",
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
  ];

  return (
    <div>

      {/* Stats grid */}
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 cursor-pointer"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            {/* Gradient background */}
            <div
              className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
            />

            {/* Icon */}
            <stat.icon
              className="relative mb-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110"
              style={{ color: stat.color }}
            />

            {/* Label */}
            <p className="relative text-sm text-white/50">{stat.label}</p>

            {/* Value */}
            <p className="relative text-xl font-bold text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SpendingSummary;

