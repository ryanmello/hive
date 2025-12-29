"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  Utensils,
  ShoppingCart,
  Car,
  Film,
  ShoppingBag,
  Zap,
  Heart,
  Plane,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { SpendingCategory } from "@/data/mock-data";
import { formatCurrency, formatDate } from "@/data/mock-data";

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Home,
  Utensils,
  ShoppingCart,
  Car,
  Film,
  ShoppingBag,
  Zap,
  Heart,
  Plane,
  Dumbbell,
};

interface CategoryDetailProps {
  category: SpendingCategory | null;
  onClose: () => void;
  totalSpending: number;
}

export function CategoryDetail({
  category,
  onClose,
  totalSpending,
}: CategoryDetailProps) {
  const isOpen = category !== null;
  const Icon = category ? iconMap[category.icon] || Home : Home;

  // Calculate trend (mock - comparing to "last month")
  const trendPercentage = React.useMemo(() => {
    if (!category) return 0;
    // Simulate random trend between -20% and +20%
    return Math.round((Math.random() - 0.5) * 40);
  }, [category?.id]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <SheetContent
        side="right"
        className="w-full max-w-md overflow-hidden border-l border-white/10 p-0 sm:max-w-md"
        showOverlay={false}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {category && (
          <div className="flex h-full flex-col">
            {/* Header with gradient */}
            <SheetHeader
              className="relative overflow-hidden p-6 pb-8"
              style={{
                background: `linear-gradient(135deg, ${category.gradient.from}20 0%, ${category.gradient.to}10 100%)`,
              }}
            >
              {/* Decorative glow */}
              <div
                className="absolute -right-20 -top-20 h-40 w-40 opacity-50 blur-3xl"
                style={{ backgroundColor: category.gradient.from }}
              />

              {/* Category icon and name */}
              <div className="relative flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${category.gradient.from}, ${category.gradient.to})`,
                  }}
                >
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-2xl font-bold text-white">
                    {category.name}
                  </SheetTitle>
                  <SheetDescription className="text-white/60">
                    {category.transactions.length} transactions
                  </SheetDescription>
                </div>
              </div>

              {/* Amount and percentage */}
              <div className="relative mt-6 flex items-end justify-between">
                <div>
                  <p className="text-sm text-white/60">Total Spent</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(category.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/60">of budget</p>
                  <p className="text-2xl font-bold text-white">
                    {category.percentage}%
                  </p>
                </div>
              </div>

              {/* Trend indicator */}
              <div className="relative mt-4 flex items-center gap-2">
                {trendPercentage > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-400">
                      +{trendPercentage}% from last month
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">
                      {trendPercentage}% from last month
                    </span>
                  </>
                )}
              </div>
            </SheetHeader>

            {/* Progress bar showing category as part of total */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Portion of total spending</span>
                <span className="font-medium text-white">
                  {formatCurrency(category.amount)} /{" "}
                  {formatCurrency(totalSpending)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${category.percentage}%`,
                    background: `linear-gradient(90deg, ${category.gradient.from}, ${category.gradient.to})`,
                  }}
                />
              </div>
            </div>

            {/* Transactions list */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/40">
                Recent Transactions
                <ArrowRight className="h-3 w-3" />
              </h3>

              <div className="space-y-3">
                {category.transactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className="group flex items-center justify-between rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Merchant icon placeholder */}
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, ${category.gradient.from}40, ${category.gradient.to}40)`,
                        }}
                      >
                        {transaction.merchant.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {transaction.merchant}
                        </p>
                        <p className="text-sm text-white/50">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-white">
                      -{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default CategoryDetail;
