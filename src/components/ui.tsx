import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { C } from '@/lib/theme';
import { speciesColor } from '@/lib/species';
import type { Catch } from '@/lib/types';
import { hm, ymd } from '@/lib/geo';
import { Image } from 'react-native';

export const Card = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.card, style]}>{children}</View>;

export const H2 = ({ children }: { children: React.ReactNode }) => <Text style={s.h2}>{children}</Text>;
export const H3 = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <View style={s.row}>
    <Text style={s.h3}>{children}</Text>
    {right}
  </View>
);
export const Sub = ({ children, style }: { children: React.ReactNode; style?: object }) => <Text style={[s.sub, style]}>{children}</Text>;

export const Stat = ({ value, label, color }: { value: string; label: string; color?: string }) => (
  <View style={s.stat}>
    <Text style={[s.statV, color ? { color } : null]}>{value}</Text>
    <Text style={s.statL}>{label}</Text>
  </View>
);

export const Pill = ({ label, active, color, onPress }: { label: string; active?: boolean; color?: string; onPress?: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }} style={[s.pill, active && s.pillOn]}>
    {color ? <View style={[s.dot, { backgroundColor: color }]} /> : null}
    <Text style={[s.pillT, active && { color: '#fff' }]}>{label}</Text>
  </Pressable>
);

export const Button = ({ label, onPress, primary, style, disabled }: { label: string; onPress?: () => void; primary?: boolean; style?: StyleProp<ViewStyle>; disabled?: boolean }) => (
  <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => [s.btn, primary && s.btnP, (pressed || disabled) && { opacity: 0.7 }, style]}>
    <Text style={[s.btnT, primary && { color: '#fff' }]}>{label}</Text>
  </Pressable>
);

export const Bar = ({ ratio, color = C.sea2 }: { ratio: number; color?: string }) => (
  <View style={s.bar}>
    <View style={[s.barFill, { width: `${Math.max(2, Math.min(100, ratio * 100))}%`, backgroundColor: color }]} />
  </View>
);

export const Rank = ({ items, color }: { items: { label: string; value: number; color?: string }[]; color?: string }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={{ gap: 10 }}>
      {items.map((it, i) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[s.sub, { width: 16 }]}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.body}>{it.label}</Text>
            <Bar ratio={it.value / max} color={it.color ?? color} />
          </View>
          <Text style={[s.body, { fontWeight: '700' }]}>{it.value}마리</Text>
        </View>
      ))}
    </View>
  );
};

export const Columns = ({ data }: { data: [string, number][] }) => {
  const max = Math.max(1, ...data.map((d) => d[1]));
  const best = Math.max(...data.map((d) => d[1]));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 }}>
      {data.map(([k, v]) => (
        <View key={k} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
          <Text style={[s.body, { fontSize: 11, fontWeight: '700' }]}>{v}</Text>
          <View style={{ width: '100%', height: `${(v / max) * 70}%`, minHeight: 2, borderRadius: 5, backgroundColor: v === best && v > 0 ? C.accent : C.sea2 }} />
          <Text style={[s.sub, { fontSize: 10.5 }]}>{k}</Text>
        </View>
      ))}
    </View>
  );
};

export const CatchRow = ({ c, place }: { c: Catch; place: string }) => (
  <View style={s.catchRow}>
    <View style={[s.thumb, { backgroundColor: speciesColor(c.species) }]}>
      {c.photoUri ? <Image source={{ uri: c.photoUri }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: '#fff', fontWeight: '900' }}>{c.species.slice(0, 1)}</Text>}
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={s.body}>
        <Text style={{ fontWeight: '700' }}>
          {c.species} {c.count}마리
        </Text>{' '}
        <Text style={s.sub}>{c.sizeCm}cm</Text>
      </Text>
      <Text style={s.sub} numberOfLines={1}>
        {place} · {ymd(c.at).slice(5).replace('-', '.')} {hm(c.at)} · {c.rig}
      </Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={s.sub}>{c.cond.tide}</Text>
      {c.cond.waterTemp != null ? <Text style={s.sub}>{c.cond.waterTemp.toFixed(1)}°C</Text> : null}
    </View>
  </View>
);

export const Tip = ({ children }: { children: React.ReactNode }) => <View style={s.tip}>{typeof children === 'string' ? <Text style={s.tipT}>{children}</Text> : children}</View>;

export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  h2: { fontSize: 20, fontWeight: '900', color: C.fg, letterSpacing: -0.4 },
  h3: { fontSize: 15, fontWeight: '700', color: C.fg },
  sub: { fontSize: 12, color: C.muted },
  body: { fontSize: 14, color: C.fg },
  stat: { flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 10, minWidth: 90 },
  statV: { fontSize: 18, fontWeight: '800', color: C.fg, fontVariant: ['tabular-nums'] },
  statL: { fontSize: 11, color: C.muted, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  pillOn: { backgroundColor: C.fg, borderColor: C.fg },
  pillT: { fontSize: 13, color: C.fg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: C.foam, borderWidth: 1, borderColor: C.line, alignItems: 'center' },
  btnP: { backgroundColor: C.accent, borderColor: C.accent },
  btnT: { fontSize: 14, fontWeight: '700', color: C.fg },
  bar: { height: 8, borderRadius: 4, backgroundColor: C.foam, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 4 },
  catchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  thumb: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tip: { backgroundColor: C.accentSoft, borderRadius: 12, padding: 12 },
  tipT: { fontSize: 13.5, lineHeight: 21, color: C.fg },
  screen: { padding: 16, gap: 14, paddingBottom: 40 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 11, fontSize: 15, color: C.fg, backgroundColor: C.card },
  label: { fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 6 },
});
