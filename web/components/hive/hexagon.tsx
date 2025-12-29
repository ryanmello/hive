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
  type LucideIcon,
} from "lucide-react";
import type { SpendingCategory } from "@/data/mock-data";
import { formatCurrency } from "@/data/mock-data";

// Icon mapping for category icons
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

interface HexagonProps {
  category: SpendingCategory;
  size: number; // Base size in pixels
  onClick?: () => void;
  isSelected?: boolean;
  style?: React.CSSProperties;
  animationDelay?: number;
}

export function Hexagon({
  category,
  size,
  onClick,
  isSelected = false,
  style,
  animationDelay = 0,
}: HexagonProps) {
  const Icon = iconMap[category.icon] || Home;

  // Size is now calculated by the grid and passed directly
  // Hexagon dimensions (pointy-top orientation)
  const width = size;
  const height = size * 1.1547; // Height ratio for regular hexagon

  // SVG path for hexagon (pointy-top orientation)
  const hexPath = `
    M ${width / 2} 0
    L ${width} ${height * 0.25}
    L ${width} ${height * 0.75}
    L ${width / 2} ${height}
    L 0 ${height * 0.75}
    L 0 ${height * 0.25}
    Z
  `;

  return (
    <div
      className={cn(
        "group relative cursor-pointer transition-all duration-300 ease-out",
        "hover:z-20 hover:scale-110",
        isSelected && "z-30 scale-115"
      )}
      style={{
        width,
        height,
        animationDelay: `${animationDelay}ms`,
        ...style,
      }}
      onClick={onClick}
    >
      {/* Glow effect on hover */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 blur-xl transition-opacity duration-300",
          "group-hover:opacity-60",
          isSelected && "opacity-80"
        )}
        style={{
          background: `radial-gradient(circle, ${category.color}80 0%, transparent 70%)`,
        }}
      />

      {/* Main hexagon SVG */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="relative z-10 drop-shadow-lg transition-all duration-300 group-hover:drop-shadow-2xl"
      >
        {/* Base hexagon with solid color */}
        <path
          d={hexPath}
          fill={category.color}
          className="transition-all duration-300"
        />

        {/* Border */}
        <path
          d={hexPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
          className="transition-all duration-300 group-hover:stroke-white/40"
        />

        {/* Inner border glow when selected */}
        {isSelected && (
          <path
            d={hexPath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Content overlay */}
      <div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center"
        style={{ 
          padding: size * 0.08,
          paddingTop: size * 0.15,
          paddingBottom: size * 0.15,
        }}
      >
        {/* Icon */}
        <Icon
          className="mb-1 shrink-0 text-white drop-shadow-md transition-transform duration-300 group-hover:scale-110"
          style={{
            width: Math.max(size * 0.2, 16),
            height: Math.max(size * 0.2, 16),
          }}
        />

        {/* Category name */}
        <span
          className="w-full text-center font-medium leading-tight text-white drop-shadow-md"
          style={{
            fontSize: Math.max(size * 0.09, 9),
            lineHeight: 1.2,
            wordBreak: "break-word",
            hyphens: "auto",
          }}
        >
          {category.name}
        </span>

        {/* Amount */}
        <span
          className="mt-0.5 shrink-0 font-bold text-white drop-shadow-md"
          style={{ fontSize: Math.max(size * 0.1, 10) }}
        >
          {formatCurrency(category.amount)}
        </span>

        {/* Percentage badge */}
        <span
          className="mt-1 shrink-0 rounded-full bg-black/30 px-1.5 py-0.5 text-white/90 backdrop-blur-sm"
          style={{ fontSize: Math.max(size * 0.07, 7) }}
        >
          {category.percentage}%
        </span>
      </div>
    </div>
  );
}

export default Hexagon;

