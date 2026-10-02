'use client';

import { motion, useReducedMotion } from 'motion/react';

const WIDTH = 560;
const HEIGHT = 420;
const LEFT = 44;
const RIGHT = 500;
const TOP = 36;
const BOTTOM = 372;
const MAX_MONTH = 24;
const MIN_VALUE = 2;
const MAX_VALUE = 16;

const REFERENCE_CURVE = [3.3, 4.5, 5.6, 6.4, 7, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6, 9.9, 10.1, 10.3, 10.5, 10.7, 10.9, 11.1, 11.3, 11.5, 11.8, 12, 12.2];

const BANDS = [
  { lower: 0.83, upper: 1.2, opacity: 0.1 },
  { lower: 0.9, upper: 1.11, opacity: 0.14 },
] as const;

const BAND_LABELS = [
  { label: 'P97', factor: 1.2 },
  { label: 'P50', factor: 1 },
  { label: 'P3', factor: 0.83 },
] as const;

const CONTROLS = [
  { month: 0, factor: 0.97 },
  { month: 1, factor: 0.98 },
  { month: 2, factor: 1 },
  { month: 4, factor: 1.02 },
  { month: 6, factor: 1.01 },
  { month: 9, factor: 1 },
  { month: 12, factor: 0.99 },
  { month: 15, factor: 1 },
  { month: 18, factor: 1.01 },
  { month: 24, factor: 1.02 },
] as const;

const MONTH_TICKS = [0, 6, 12, 18, 24] as const;
const CURVE_DELAY = 0.35;
const CURVE_DURATION = 1.9;

interface Point {
  x: number;
  y: number;
}

function referenceAt(month: number): number {
  return REFERENCE_CURVE[month] ?? REFERENCE_CURVE[REFERENCE_CURVE.length - 1] ?? MIN_VALUE;
}

function toPoint(month: number, value: number): Point {
  return {
    x: LEFT + (month / MAX_MONTH) * (RIGHT - LEFT),
    y: BOTTOM - ((value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * (BOTTOM - TOP),
  };
}

function smoothPath(points: readonly Point[]): string {
  const [first, ...rest] = points;

  if (first === undefined) {
    return '';
  }

  const segments = rest.map((current, index) => {
    const previous = points[index] ?? current;
    const beforePrevious = points[index - 1] ?? previous;
    const next = points[index + 2] ?? current;
    const control1 = { x: previous.x + (current.x - beforePrevious.x) / 6, y: previous.y + (current.y - beforePrevious.y) / 6 };
    const control2 = { x: current.x - (next.x - previous.x) / 6, y: current.y - (next.y - previous.y) / 6 };

    return `C ${control1.x.toFixed(1)} ${control1.y.toFixed(1)}, ${control2.x.toFixed(1)} ${control2.y.toFixed(1)}, ${current.x.toFixed(1)} ${current.y.toFixed(1)}`;
  });

  return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} ${segments.join(' ')}`;
}

function curveFor(factor: number): Point[] {
  return REFERENCE_CURVE.map((_, month) => toPoint(month, referenceAt(month) * factor));
}

function bandPath(lower: number, upper: number): string {
  const top = curveFor(upper);
  const bottom = curveFor(lower).reverse();
  const bottomPath = smoothPath(bottom).replace(/^M/, 'L');

  return `${smoothPath(top)} ${bottomPath} Z`;
}

const CONTROL_POINTS = CONTROLS.map((control) => ({ ...control, ...toPoint(control.month, referenceAt(control.month) * control.factor) }));
const CHILD_PATH = smoothPath(CONTROL_POINTS);
const LAST_CONTROL = CONTROL_POINTS[CONTROL_POINTS.length - 1] ?? toPoint(MAX_MONTH, referenceAt(MAX_MONTH));

export const LAST_CONTROL_POSITION = {
  left: `${(LAST_CONTROL.x / WIDTH) * 100}%`,
  top: `${(LAST_CONTROL.y / HEIGHT) * 100}%`,
};

export const CHART_SEQUENCE_END = CURVE_DELAY + CURVE_DURATION;

export function GrowthChartArt(): React.JSX.Element {
  const reduceMotion = useReducedMotion() === true;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full" aria-hidden="true">
      {MONTH_TICKS.map((month) => {
        const { x } = toPoint(month, MIN_VALUE);

        return (
          <g key={month}>
            <line x1={x} x2={x} y1={TOP} y2={BOTTOM} stroke="#ffffff" strokeOpacity="0.12" strokeDasharray="2 6" />
            <text x={x} y={BOTTOM + 26} textAnchor="middle" fill="#ffffff" fillOpacity="0.7" fontSize="13">
              {month === 0 ? 'Nacer' : `${month} m`}
            </text>
          </g>
        );
      })}
      <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} stroke="#ffffff" strokeOpacity="0.3" />

      {BANDS.map((band) => (
        <motion.path
          key={band.lower}
          d={bandPath(band.lower, band.upper)}
          fill="#ffffff"
          fillOpacity={band.opacity}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      ))}
      <path d={smoothPath(curveFor(1))} fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 5" />

      {BAND_LABELS.map((band) => {
        const end = toPoint(MAX_MONTH, referenceAt(MAX_MONTH) * band.factor);

        return (
          <text key={band.label} x={end.x + 12} y={end.y + 4} fill="#ffffff" fillOpacity="0.75" fontSize="12" fontWeight="600">
            {band.label}
          </text>
        );
      })}

      <motion.path
        d={CHILD_PATH}
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        initial={reduceMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: CURVE_DELAY, duration: CURVE_DURATION, ease: [0.65, 0, 0.35, 1] }}
      />

      {CONTROL_POINTS.map((point) => (
        <motion.circle
          key={point.month}
          cx={point.x}
          cy={point.y}
          r={point.month === MAX_MONTH ? 8 : 5.5}
          fill={point.month === MAX_MONTH ? '#38b6e8' : '#ffffff'}
          stroke="#ffffff"
          strokeWidth={point.month === MAX_MONTH ? 4 : 0}
          initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: CURVE_DELAY + CURVE_DURATION * (point.month / MAX_MONTH) * 0.92,
            type: 'spring',
            stiffness: 420,
            damping: 18,
          }}
          style={{ transformOrigin: `${point.x}px ${point.y}px` }}
        />
      ))}
    </svg>
  );
}
