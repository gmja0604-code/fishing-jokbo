// 기록 백업: 모든 포인트·조과·출조 기록을 JSON 파일 하나로 내보내고 다시 불러온다.
// 사진 파일 자체는 담지 않는다(용량). 같은 폰에서 복원하면 사진도 그대로 보인다.
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { normalizeData, type AppData } from './store';

const APP = 'fishing-jokbo';

export async function exportBackup(data: AppData): Promise<string | null> {
  if (Platform.OS === 'web') return '웹에서는 백업 파일을 만들 수 없어요.';
  const stamp = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const f = new File(Paths.cache, `낚시족보-백업-${stamp}.json`);
  if (f.exists) f.delete();
  f.create();
  f.write(JSON.stringify({ app: APP, version: 1, exportedAt: new Date().toISOString(), data: { ...data, activeTripId: undefined } }));
  if (!(await Sharing.isAvailableAsync())) return '이 폰에서는 파일 공유를 쓸 수 없어요.';
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: '백업 파일 저장·보내기' });
  return null;
}

/** 백업 파일을 골라 읽는다. 취소하면 null, 형식이 틀리면 오류 메시지 */
export async function pickBackup(): Promise<{ data: AppData } | { error: string } | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.[0]) return null;
  try {
    const raw = JSON.parse(await new File(r.assets[0].uri).text());
    const data = normalizeData(raw?.app === APP ? raw.data : raw);
    if (!data) return { error: '낚시 족보 백업 파일이 아니에요.' };
    // 다른 폰에서 만든 백업이면 사진 주소가 없으니 지운다
    data.catches = data.catches.map((c) => {
      if (!c.photoUri) return c;
      try {
        return new File(c.photoUri).exists ? c : { ...c, photoUri: undefined };
      } catch {
        return { ...c, photoUri: undefined };
      }
    });
    return { data };
  } catch {
    return { error: '파일을 읽지 못했어요. 백업 파일이 맞는지 확인해 주세요.' };
  }
}
