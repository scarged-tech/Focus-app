"use client";

import { useId } from "react";

/**
 * Gráficos ligeros en SVG puro (sin librerías externas) para mostrar
 * progreso real: balance en el tiempo, carga de entrenamiento, minutos
 * de estudio, etc. Pensados para verse bien sobre las tarjetas oscuras
 * de la app.
 */

// ---------- Gráfico de línea/área (ej. balance, progresión de carga) ----------
export function LineChart({ data, height = 120, color = "#8B5CF6", colorTo = "#38BDF8", showDots = true, formatValue }) {
  const uid = useId();
  if (!data || data.length === 0) {
    return <div className="h-[120px] flex items-center justify-center text-xs text-onyx">Sin datos todavía</div>;
  }

  const w = 600;
  const h = height;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const padY = 14;
  const step = data.length > 1 ? w / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? i * step : w / 2;
    const y = h - padY - ((d.value - min) / range) * (h - padY * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x},${h} L ${points[0].x},${h} Z`;
  const last = points[points.length - 1];
  const areaGradientId = `areaFill-${uid}`;
  const strokeGradientId = `lineStroke-${uid}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={colorTo} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={strokeGradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={colorTo} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${areaGradientId})`} />
      <path d={linePath} fill="none" stroke={`url(#${strokeGradientId})`} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {showDots &&
        points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4.5 : 2.5} fill={i === points.length - 1 ? colorTo : "#050505"} stroke={colorTo} strokeWidth="1.5" />
        ))}
    </svg>
  );
}

// ---------- Gráfico de barras (ej. hábitos por día, minutos por materia) ----------
export function BarChart({ data, height = 90, color = "#8B5CF6", maxOverride }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center text-xs text-onyx" style={{ height }}>Sin datos todavía</div>;
  }
  const max = maxOverride || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => {
        const pct = Math.max((d.value / max) * 100, d.value > 0 ? 6 : 0);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={d.label}>
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${pct}%`,
                backgroundColor: d.highlight ? color : `${color}55`,
                minHeight: d.value > 0 ? 3 : 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
