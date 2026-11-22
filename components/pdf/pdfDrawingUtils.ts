export type WebTheme = "ORIGINAL" | "NIGHT" | "SEPIA";
export type WebDrawTool = "HIGHLIGHTER" | "PEN" | "ERASER";

export interface WebDrawingPoint {
  x: number;
  y: number;
}

export interface WebDrawingStroke {
  colorHex: string;
  points: WebDrawingPoint[];
  isEraser?: boolean;
  strokeWidth?: number;
  strokeWidthFraction?: number;
  isPen?: boolean;
}

export interface OutlineEntry {
  title: string;
  pageNumber: number; // 1-based
  level: number;
}

export interface SearchMatchRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SearchMatchItem {
  pageNumber: number; // 1-based
  snippet: string;
}

export const STROKE_COLORS = ["#FFD700", "#00E676", "#00F0FF", "#FF4545"];

function pointToSegDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq <= 1e-9) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const t = Math.min(1, Math.max(0, ((px - ax) * abx + (py - ay) * aby) / lenSq));
  const projX = ax + t * abx;
  const projY = ay + t * aby;
  const dx = px - projX;
  const dy = py - projY;
  return dx * dx + dy * dy;
}

export function isPointNearWebStroke(
  nx: number,
  ny: number,
  stroke: WebDrawingStroke,
  aspectRatio: number
): boolean {
  if (stroke.isEraser || !stroke.points || stroke.points.length === 0) return false;
  const safeAspect = Math.min(4, Math.max(0.25, aspectRatio || 0.707));
  const radius = Math.max(0.025, (stroke.strokeWidthFraction || 0.03) * 0.65);
  const rSq = radius * radius;
  const pts = stroke.points;

  if (pts.length === 1) {
    const dx = nx - pts[0].x;
    const dy = (ny - pts[0].y) / safeAspect;
    return dx * dx + dy * dy <= rSq;
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const distSq = pointToSegDistSq(
      nx,
      ny / safeAspect,
      pts[i].x,
      pts[i].y / safeAspect,
      pts[i + 1].x,
      pts[i + 1].y / safeAspect
    );
    if (distSq <= rSq) return true;
  }
  return false;
}

export function buildSvgSmoothPath(points: WebDrawingPoint[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) * 0.5;
    const midY = (prev.y + curr.y) * 0.5;
    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}