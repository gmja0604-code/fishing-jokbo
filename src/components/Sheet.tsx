import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { C } from '@/lib/theme';

export default function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={st.bg} onPress={onClose} accessibilityLabel="닫기" />
        <View style={st.sheet}>
          <View style={st.grab} />
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const st = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(5,20,26,0.35)' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 8, maxHeight: '85%' },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: C.line, alignSelf: 'center', marginBottom: 10 },
});
