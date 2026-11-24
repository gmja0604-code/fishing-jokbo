import React, { useState } from 'react';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { C } from '@/lib/theme';
import type { HourPoint } from '@/lib/marine';

/** 오늘 해수면 높이 곡선과 만조·간조 시각 */
export default function TideChart({ points, width }: { points: HourPoint[]; width: number }) {
  const [kstHour] = useState(() => {
    const d = new Date(Date.now() + 9 * 3600e3);
    return d.getUTCHours() + d.getUTCMinutes() / 60;
  });
  const H = 130, pad = 22, W = width;
  if (points.length < 3) return null;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const X = (i: number) => pad + (i / (points.length - 1)) * (W - 2 * pad);
  const Y = (v: number) => 20 + (1 - (v - lo) / (hi - lo || 1)) * (H - 44);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.value).toFixed(1)}`).join('');
  const ext: { i: number; kind: '만조' | '간조' }[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    if (vals[i] > vals[i - 1] && vals[i] >= vals[i + 1]) ext.push({ i, kind: '만조' });
    if (vals[i] < vals[i - 1] && vals[i] <= vals[i + 1]) ext.push({ i, kind: '간조' });
  }
  const nowX = pad + (kstHour / (points.length - 1)) * (W - 2 * pad);
  return (
    <Svg width={W} height={H + 16}>
      <Path d={`${d}L${X(points.length - 1)} ${H}L${X(0)} ${H}Z`} fill={C.foam} />
      <Path d={d} stroke={C.sea2} strokeWidth={2} fill="none" />
      {ext.map((e) => (
        <React.Fragment key={e.i}>
          <Circle cx={X(e.i)} cy={Y(vals[e.i])} r={3} fill={C.sea2} />
          <SvgText x={X(e.i)} y={e.kind === '만조' ? Y(vals[e.i]) - 8 : Y(vals[e.i]) + 16} fontSize={10.5} fill={C.fg} textAnchor="middle">
            {`${e.kind} ${points[e.i].time.slice(11, 16)}`}
          </SvgText>
        </React.Fragment>
      ))}
      <Line x1={nowX} x2={nowX} y1={8} y2={H} stroke={C.accent} strokeDasharray="3 3" />
      {[0, 6, 12, 18, 23].map((h) => (
        <SvgText key={h} x={X(Math.min(h, points.length - 1))} y={H + 13} fontSize={10} fill={C.muted} textAnchor="middle">
          {`${String(h).padStart(2, '0')}시`}
        </SvgText>
      ))}
    </Svg>
  );
}
