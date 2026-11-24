// 안드로이드용 지도: 구글 지도 키 없이 쓰는 MapLibre(WebView) 지도.
// 일반 = OpenStreetMap, 위성 = Esri World Imagery, 3D = OSM + AWS 지형 고도 타일.
// 지도 라이브러리(MapLibre)는 앱 안에 들어 있어서 통신이 약해도 화면·핀·내 위치는 뜬다. 지도 그림(타일)만 통신이 필요하다.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '@/lib/theme';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

// react-native-webview 타입이 React 19.3 타입과 맞지 않아 컴포넌트 타입만 좁혀 쓴다.
const WV = WebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<WebView> }>;

export interface WebMapPin { id: string; lat: number; lng: number; color: string; label: string; count: number }
export interface WebMapHandle { flyTo: (lat: number, lng: number, zoom?: number) => void }

/* eslint-disable @typescript-eslint/no-require-imports */
const LIB_JS = require('../../assets/vendor/maplibre-gl.js.txt');
const LIB_CSS = require('../../assets/vendor/maplibre-gl.css.txt');
/* eslint-enable @typescript-eslint/no-require-imports */
const CDN = '<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css"><script src="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js"></script>';

async function readAsset(mod: number) {
  const a = Asset.fromModule(mod);
  await a.downloadAsync();
  return new File(a.localUri ?? a.uri).text();
}

/** 앱에 들어 있는 MapLibre를 HTML에 직접 넣는다. 읽기에 실패하면 인터넷(CDN)에서 받는다. */
async function buildHtml() {
  try {
    const [js, css] = await Promise.all([readAsset(LIB_JS), readAsset(LIB_CSS)]);
    return HEAD + '<style>' + css + '</style><script>' + js.replace(/<\/script/gi, '<\\/script') + '</script>' + BODY;
  } catch {
    return HEAD + CDN + BODY;
  }
}

const HEAD = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">';
const BODY = `<style>html,body,#m{margin:0;height:100%;background:#cfe3e8}
.pin{position:relative;width:30px;height:40px;cursor:pointer}
.pin svg{position:absolute;left:0;top:0}
.pin b{position:absolute;left:0;top:7px;width:30px;text-align:center;font:700 10px sans-serif}
.lbl{position:absolute;left:30px;top:4px;white-space:nowrap;font:700 12px sans-serif;color:#13262e;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff}
.sat .lbl{color:#fff;text-shadow:0 0 3px #000,0 0 3px #000}
.me{width:14px;height:14px;border-radius:50%;background:#2f7bf5;border:3px solid #fff;box-shadow:0 0 0 8px rgba(47,123,245,.18)}
.maplibregl-ctrl-attrib{font-size:9px}
</style></head><body><div id="m"></div><script>
const post=(o)=>window.ReactNativeWebView.postMessage(JSON.stringify(o));
if(!window.maplibregl){post({type:'fail'});throw new Error('no maplibre');}
const OSM={type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap'};
const SAT={type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'© Esri'};
const REF={type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19};
const DEM={type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:14};
const style=(mode)=>({version:8,sources:{osm:OSM,sat:SAT,ref:REF,dem:DEM,hs:DEM},
 layers: mode==='sat'?[{id:'sat',type:'raster',source:'sat'},{id:'ref',type:'raster',source:'ref'}]
 : mode==='3d'?[{id:'osm',type:'raster',source:'osm'},{id:'hs',type:'hillshade',source:'hs',paint:{'hillshade-exaggeration':0.35}}]
 : [{id:'osm',type:'raster',source:'osm'}],
 terrain: mode==='3d'?{source:'dem',exaggeration:1.5}:undefined});
let map,markers=[],meMarker,mode='2d';
map=new maplibregl.Map({container:'m',style:style('2d'),center:[129.19,35.17],zoom:11,maxPitch:75,attributionControl:{compact:true}});
post({type:'ready'});
// 타일을 못 받으면(통신 약함) 앱에 알린다. 20초에 한 번만
let lastErr=0;map.on('error',(e)=>{const t=Date.now();if(t-lastErr>20000){lastErr=t;post({type:'tileerror'})}});
map.on('data',(e)=>{if(e.dataType==='source'&&e.tile&&lastErr&&Date.now()-lastErr>3000){lastErr=0;post({type:'tileok'})}});
// 길게 누르기 → 포인트 저장
let lp=null;
map.on('touchstart',(e)=>{if(e.originalEvent.touches.length!==1)return;const ll=e.lngLat;clearTimeout(lp);lp=setTimeout(()=>post({type:'longpress',lat:ll.lat,lng:ll.lng}),600)});
['touchend','touchmove','touchcancel','dragstart','zoomstart'].forEach(ev=>map.on(ev,()=>clearTimeout(lp)));
map.on('contextmenu',(e)=>post({type:'longpress',lat:e.lngLat.lat,lng:e.lngLat.lng}));
function pinEl(p){const d=document.createElement('div');d.className='pin';
 d.innerHTML='<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39C6 26 1 20 1 13a14 14 0 0 1 28 0c0 7-5 13-14 26Z" fill="'+p.color+'" stroke="#fff" stroke-width="2"/><circle cx="15" cy="13" r="7" fill="#fff"/></svg><b style="color:'+p.color+'">'+p.count+'</b><span class="lbl"></span>';
 d.querySelector('.lbl').textContent=p.label;
 d.addEventListener('click',(ev)=>{ev.stopPropagation();post({type:'marker',id:p.id})});return d}
window.__set=(s)=>{
 if(s.mode&&s.mode!==mode){mode=s.mode;map.setStyle(style(mode));document.body.className=mode==='sat'?'sat':'';
  map.easeTo({pitch:mode==='3d'?65:0,bearing:mode==='3d'?-20:0,zoom:mode==='3d'?Math.max(map.getZoom(),13):map.getZoom(),duration:700});}
 if(s.pins){markers.forEach(m=>m.remove());markers=s.pins.map(p=>new maplibregl.Marker({element:pinEl(p),anchor:'bottom'}).setLngLat([p.lng,p.lat]).addTo(map));}
 if(s.me){if(!meMarker){const e=document.createElement('div');e.className='me';meMarker=new maplibregl.Marker({element:e}).setLngLat([s.me.lng,s.me.lat]).addTo(map)}else meMarker.setLngLat([s.me.lng,s.me.lat])}
 if(s.fly)map.flyTo({center:[s.fly.lng,s.fly.lat],zoom:s.fly.zoom||15});
};
</script></body></html>`;

export default function WebMap({ pins, mode, me, onMarkerPress, onLongPress, ref }: {
  pins: WebMapPin[];
  mode: '2d' | 'sat' | '3d';
  me: { lat: number; lng: number } | null;
  onMarkerPress: (id: string) => void;
  onLongPress: (lat: number, lng: number) => void;
  ref?: React.Ref<WebMapHandle>;
}) {
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [weak, setWeak] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    buildHtml().then((h) => alive && setHtml(h));
    return () => { alive = false; };
  }, []);
  const send = (o: object) => web.current?.injectJavaScript(`window.__set && window.__set(${JSON.stringify(o)});true;`);

  useImperativeHandle(ref, () => ({ flyTo: (lat, lng, zoom) => send({ fly: { lat, lng, zoom } }) }));
  useEffect(() => { if (ready) send({ pins }); }, [ready, pins]);  
  useEffect(() => { if (ready) send({ mode }); }, [ready, mode]);  
  useEffect(() => { if (ready && me) send({ me }); }, [ready, me]);  

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'ready') { setReady(true); setFailed(false); }
      if (m.type === 'fail') setFailed(true);
      if (m.type === 'tileerror') setWeak(true);
      if (m.type === 'tileok') setWeak(false);
      if (m.type === 'marker') onMarkerPress(m.id);
      if (m.type === 'longpress') onLongPress(m.lat, m.lng);
    } catch {}
  };

  if (!html) return <View style={[StyleSheet.absoluteFill, st.center]}><ActivityIndicator color={C.sea2} /></View>;
  return (
    <View style={StyleSheet.absoluteFill}>
      <WV
        key={reloadKey}
        ref={web}
        source={{ html, baseUrl: 'https://github.com/gmja0604-code/fishing-jokbo' }}
        style={StyleSheet.absoluteFill}
        onMessage={onMessage}
        onError={() => setFailed(true)}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
      />
      {failed ? (
        <View style={[StyleSheet.absoluteFill, st.center, { backgroundColor: C.bg, padding: 24, gap: 10 }]}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.fg }}>지도를 띄우지 못했어요</Text>
          <Text style={{ color: C.muted, textAlign: 'center' }}>통신이 약한 곳일 수 있어요. 기록·족보·물때는 그대로 쓸 수 있어요.</Text>
          <Pressable onPress={() => { setFailed(false); setReady(false); setReloadKey((k) => k + 1); }} style={st.btn}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>다시 시도</Text>
          </Pressable>
        </View>
      ) : weak ? (
        <View style={st.weak} pointerEvents="none">
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>통신이 약해 지도 그림이 안 나와요. 핀과 내 위치는 그대로예요.</Text>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  btn: { backgroundColor: C.sea2, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  weak: { position: 'absolute', left: 12, right: 12, bottom: 96, backgroundColor: '#13262ecc', borderRadius: 10, padding: 8, alignItems: 'center' },
});
