"use client";

import * as React from "react";
import { Hexagon } from "./hexagon";
import type { SpendingCategory } from "@/data/mock-data";

interface HexagonGridProps {
  categories: SpendingCategory[];
  onSelectCategory: (category: SpendingCategory | null) => void;
  selectedCategory: SpendingCategory | null;
}

interface PlacedHexagon {
  x: number;
  y: number;
  category: SpendingCategory;
  size: number;
  radius: number; // Circumradius for collision detection
}

// Gap between hexagons (in pixels)
const HEX_GAP = 12;

// Calculate hexagon size based on percentage
function getHexagonSize(percentage: number, baseSize: number): number {
  // Scale from 0.6 to 1.3 based on percentage for more dramatic size differences
  const minScale = 0.6;
  const maxScale = 1.3;
  // Normalize percentage (assuming max is around 40%)
  const normalizedPct = Math.min(percentage / 40, 1);
  const scale = minScale + normalizedPct * (maxScale - minScale);
  return baseSize * scale;
}

// Get the circumradius of a pointy-top hexagon (center to vertex)
function getHexRadius(size: number): number {
  // For a pointy-top hexagon with width = size
  // The circumradius (center to vertex) = size / sqrt(3) * (2/sqrt(3)) = size / 1.5
  // Actually, for width W, circumradius R = W / sqrt(3)
  return (size / Math.sqrt(3)) * 1.05; // Add 5% buffer
}

// Check if two hexagons would overlap
function wouldOverlap(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
  gap: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = r1 + r2 + gap;
  return distance < minDistance;
}

// Check if position overlaps with any placed hexagon
function hasCollision(
  x: number,
  y: number,
  radius: number,
  placed: PlacedHexagon[],
  gap: number
): boolean {
  for (const hex of placed) {
    if (wouldOverlap(x, y, radius, hex.x, hex.y, hex.radius, gap)) {
      return true;
    }
  }
  return false;
}

// 6 directions for hexagon placement (pointy-top, 60° increments)
// Prioritize horizontal directions first (left/right) for horizontal layout bias
const DIRECTIONS = [
  { angle: 0, name: "right", priority: 1 },
  { angle: Math.PI, name: "left", priority: 1 },
  { angle: Math.PI / 3, name: "lower-right", priority: 2 },
  { angle: (5 * Math.PI) / 3, name: "upper-right", priority: 2 },
  { angle: (2 * Math.PI) / 3, name: "lower-left", priority: 2 },
  { angle: (4 * Math.PI) / 3, name: "upper-left", priority: 2 },
];

// Horizontal bias factor - higher values prefer horizontal placement more
const HORIZONTAL_BIAS = 1.6;

// Find the best position for a new hexagon adjacent to existing ones
function findPosition(
  radius: number,
  placed: PlacedHexagon[],
  centerX: number,
  centerY: number,
  gap: number
): { x: number; y: number } {
  // First hexagon goes in center
  if (placed.length === 0) {
    return { x: centerX, y: centerY };
  }

  let bestPosition: { x: number; y: number } | null = null;
  let bestScore = Infinity;

  // Try placing adjacent to each existing hexagon
  for (const existing of placed) {
    for (const dir of DIRECTIONS) {
      // Distance from existing center to new center
      // = existing radius + new radius + gap
      const placementDistance = existing.radius + radius + gap;

      // Calculate candidate position
      const candidateX = existing.x + Math.cos(dir.angle) * placementDistance;
      const candidateY = existing.y + Math.sin(dir.angle) * placementDistance;

      // Check if this position collides with any existing hexagon
      if (!hasCollision(candidateX, candidateY, radius, placed, gap)) {
        // Calculate horizontal distance from center (penalize vertical spread)
        const horizontalDist = Math.abs(candidateX - centerX);
        const verticalDist = Math.abs(candidateY - centerY);
        
        // Score: prefer positions that are horizontally spread but vertically compact
        // Lower score is better
        const score = horizontalDist + (verticalDist * HORIZONTAL_BIAS);

        if (score < bestScore) {
          bestScore = score;
          bestPosition = { x: candidateX, y: candidateY };
        }
      }
    }
  }

  // If no valid adjacent position found, spiral outward (prefer horizontal)
  if (!bestPosition) {
    for (let ring = 1; ring <= 10; ring++) {
      const ringRadius = ring * (radius * 2 + gap);
      // Start from horizontal positions (0° and 180°)
      const angles = [0, Math.PI, Math.PI / 6, -Math.PI / 6, Math.PI + Math.PI / 6, Math.PI - Math.PI / 6];
      for (let i = 0; i < 12; i++) {
        const angle = angles[i % angles.length] || (i / 12) * Math.PI * 2;
        const candidateX = centerX + Math.cos(angle) * ringRadius;
        const candidateY = centerY + Math.sin(angle) * ringRadius;

        if (!hasCollision(candidateX, candidateY, radius, placed, gap)) {
          return { x: candidateX, y: candidateY };
        }
      }
    }
    // Fallback - shouldn't happen
    return { x: centerX + placed.length * 100, y: centerY };
  }

  return bestPosition;
}

export function HexagonGrid({
  categories,
  onSelectCategory,
  selectedCategory,
}: HexagonGridProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [positions, setPositions] = React.useState<PlacedHexagon[]>([]);
  const [isAnimated, setIsAnimated] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState(900);

  // Base hexagon size
  const baseSize = 180;

  // Track container width changes with ResizeObserver
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(container.offsetWidth);
    };

    // Set initial width
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate hexagon positions using packing algorithm
  React.useEffect(() => {
    if (!categories.length || containerWidth === 0) return;

    const centerX = containerWidth / 2;
    const centerY = 380;

    const placed: PlacedHexagon[] = [];

    // Sort categories by percentage (largest first)
    const sortedCategories = [...categories].sort(
      (a, b) => b.percentage - a.percentage
    );

    // Place each hexagon
    for (const category of sortedCategories) {
      const size = getHexagonSize(category.percentage, baseSize);
      const radius = getHexRadius(size);
      const position = findPosition(radius, placed, centerX, centerY, HEX_GAP);

      placed.push({
        x: position.x,
        y: position.y,
        category,
        size,
        radius,
      });
    }

    // Center the cluster so the largest hexagon (first placed) stays at center
    if (placed.length > 0) {
      // The first hexagon is the largest - use it as the anchor point
      const largestHex = placed[0];
      const offsetX = centerX - largestHex.x;
      const offsetY = centerY - largestHex.y;

      // Apply offset to all hexagons to keep the largest centered
      placed.forEach((p) => {
        p.x += offsetX;
        p.y += offsetY;
      });
    }

    setPositions(placed);

    // Trigger entrance animation (only on first render)
    if (!isAnimated) {
      setTimeout(() => setIsAnimated(true), 100);
    }
  }, [categories, containerWidth]);

  // Calculate container height based on positions
  const containerHeight = React.useMemo(() => {
    if (positions.length === 0) return 750;
    const maxY = Math.max(...positions.map((p) => p.y + p.radius));
    const minY = Math.min(...positions.map((p) => p.y - p.radius));
    return Math.max(maxY - minY + 150, 650);
  }, [positions]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full"
      style={{ height: containerHeight }}
    >
      {/* Ambient glow effect in background */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30"
        style={{
          width: 600,
          height: 600,
          background:
            "radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Hexagons */}
      {positions.map((pos) => {
        // Animation order based on size (largest first)
        const sizeOrder = [...positions]
          .sort((a, b) => b.size - a.size)
          .findIndex((p) => p.category.id === pos.category.id);

        // Calculate actual hexagon dimensions for positioning
        const hexWidth = pos.size;
        const hexHeight = pos.size * 1.1547;

        return (
          <div
            key={pos.category.id}
            className="absolute transition-all duration-700 ease-out"
            style={{
              left: pos.x - hexWidth / 2,
              top: pos.y - hexHeight / 2,
              width: hexWidth,
              height: hexHeight,
              opacity: isAnimated ? 1 : 0,
              transform: isAnimated
                ? "translateY(0) scale(1)"
                : "translateY(40px) scale(0.7)",
              transitionDelay: `${sizeOrder * 100}ms`,
            }}
          >
            <Hexagon
              category={pos.category}
              size={pos.size}
              onClick={() => {
                if (selectedCategory?.id !== pos.category.id) {
                  onSelectCategory(pos.category);
                }
              }}
              isSelected={selectedCategory?.id === pos.category.id}
              animationDelay={sizeOrder * 100}
            />
          </div>
        );
      })}
    </div>
  );
}

export default HexagonGrid;
