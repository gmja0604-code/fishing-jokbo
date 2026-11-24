import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '@/lib/theme';

export default function Banner({ title, body, onPress, onClose }: { title: string; body: string; onPress?: () => void; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 12000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <Pressable onPress={onPress} style={st.box} accessibilityRole="alert">
      <View style={st.ic}>
        <Ionicons name="location" size={16} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.t}>{title}</Text>
        <Text style={st.b}>{body}</Text>
      </View>
      <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="닫기">
        <Ionicons name="close" size={20} color="#ffffffaa" />
      </Pressable>
    </Pressable>
  );
}
const st = StyleSheet.create({
  box: { position: 'absolute', top: 10, left: 10, right: 10, backgroundColor: C.sea, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start', elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  ic: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  t: { color: '#fff', fontWeight: '800', fontSize: 14 },
  b: { color: '#ffffffdd', fontSize: 12.5, lineHeight: 18, marginTop: 2 },
});
