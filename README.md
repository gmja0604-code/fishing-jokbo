# 낚시 족보

낚시인이 앱 하나로 출조 준비, 현장 기록, 나만의 족보까지 하는 앱이에요. 아이폰·안드로이드 겸용(Expo, React Native)입니다.

## 주요 기능

- **지도**: 2D·위성·3D 전환, 내 위치, 길게 눌러 포인트 저장, 어종별 핀 색, 포인트 도착 배너
- **출조 시작/종료**: 낚시 전에 켜 두면 장소·시간이 기록되고, 끝나면 조과 요약과 경험치 보상. 꽝인 날도 기록
- **조과 기록**: 사진 먼저, 물때·수온·풍속·파고·달 위상 자동 첨부, 금지 체장 경고
- **바다 정보**: 날씨, 풍속, 파고, 수온, 조석 곡선, 물때, 일출·일몰, 낚시 지수 (10분마다 자동 갱신)
- **족보**: 어종별 잘 나온 포인트·물때·시간대·채비, 포인트별 어종 순위, 오늘 조건 맞춤 추천
- **포인트 상세**: 주변 화장실·식당·편의점·낚시점·주차와 영업 종료 시간, 카카오톡 등으로 포인트 보내기(대략 위치 옵션)
- **나**: 레벨·경험치, 출조 횟수와 달력, 장소별 방문·조과·꽝 히스토리, 어종별 기록고기(직접 입력), 어종 도감, 배지, 주간 퀘스트, 금어기·금지 체장
- **도착 알림**: 저장한 포인트 300m 안에 들어가면 시즌 족보 알림 (백그라운드, 개발 빌드 필요)

처음 실행하면 부산 지역 예시 포인트와 기록이 들어 있어요. "나" 화면에서 한 번에 지울 수 있어요.

## 내 휴대폰에서 실행하기

1. 컴퓨터에 [Node.js](https://nodejs.org) LTS 설치
2. 휴대폰에 **Expo Go** 설치 (앱스토어·플레이스토어)
3. 터미널에서:
   ```bash
   git clone https://github.com/gmja0604-code/fishing-jokbo
   cd fishing-jokbo
   npm install
   npx expo start
   ```
4. 화면에 나온 QR 코드를 아이폰은 카메라로, 안드로이드는 Expo Go 앱으로 찍기

휴대폰과 컴퓨터가 같은 와이파이에 있어야 해요. 안 되면 `npx expo start --tunnel`로 실행해 보세요.

### Expo Go에서 안 되는 것

- 백그라운드 **도착 알림**(앱을 꺼 둬도 오는 알림)은 개발 빌드에서만 동작해요. 지도 화면을 보고 있을 때 뜨는 도착 배너는 Expo Go에서도 돼요.
- 정식 배포용 안드로이드 빌드에는 Google Maps API 키가 필요해요 (`app.json`의 `android.config.googleMaps.apiKey`).

개발 빌드와 스토어 배포는 EAS로 해요: `npx eas-cli@latest build --profile development`.

## 데이터 출처

| 정보 | 출처 | 비고 |
| --- | --- | --- |
| 날씨·풍속·파고·수온·해수면 | [Open-Meteo](https://open-meteo.com) | 키 없음. 정식 출시 때 기상청·바다누리로 교체 예정 (`src/lib/marine.ts`) |
| 물때·달 위상 | 앱에서 직접 계산 | 남해 7물때식, 달 나이 근사 (`src/lib/lunar.ts`) |
| 화장실·식당·영업시간 | OpenStreetMap (Overpass) | 영업시간이 없는 곳이 있음 (`src/lib/amenities.ts`) |
| 금어기·체장 | 예시 | 해양수산부 고시로 갱신 예정 (`src/lib/species.ts`) |

기록은 지금은 휴대폰 안(AsyncStorage)에만 저장돼요. 계정·동기화는 다음 단계예요.

## 구조

```
src/app/            화면 (Expo Router)
  (tabs)/index.tsx  지도
  (tabs)/sea.tsx    바다 정보
  (tabs)/jokbo.tsx  족보
  (tabs)/me.tsx     나 (레벨·히스토리·도감·배지)
  record.tsx        조과 기록
  point/[id].tsx    포인트 상세
src/lib/            데이터·계산 (족보, 게임, 물때, 바다 정보, 편의시설, 저장소)
src/components/     공용 UI
```

## 확인 명령

```bash
npm run typecheck
npm run lint
```
