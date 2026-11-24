// 조과 사진을 앱 전용 폴더에 복사해 둔다. 카메라·앨범이 주는 주소는 임시 캐시라 나중에 사라질 수 있다.
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const dir = () => new Directory(Paths.document, 'photos');

export function isStoredPhoto(uri?: string) {
  return !!uri && Platform.OS !== 'web' && uri.startsWith(dir().uri);
}

/** 임시 사진을 영구 폴더로 복사하고 새 주소를 돌려준다. 실패하면 원래 주소를 그대로 쓴다. */
export function persistPhoto(uri: string | undefined, id: string): string | undefined {
  if (!uri || Platform.OS === 'web' || isStoredPhoto(uri)) return uri;
  try {
    const d = dir();
    if (!d.exists) d.create({ intermediates: true });
    const ext = (uri.split('?')[0].match(/\.(jpe?g|png|heic|webp)$/i)?.[1] ?? 'jpg').toLowerCase();
    const dest = new File(d, `${id}-${Date.now().toString(36)}.${ext}`);
    new File(uri).copySync(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

export function deletePhoto(uri?: string) {
  if (!isStoredPhoto(uri)) return;
  try {
    const f = new File(uri!);
    if (f.exists) f.delete();
  } catch {}
}
