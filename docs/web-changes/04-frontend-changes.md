# フロントエンド変更: LiveKit + Cloudflare Stream Player

## 依存パッケージの追加

```bash
pnpm --filter @repo/web add livekit-client @livekit/components-react hls.js
```

---

## 1. VTuber 配信ページ: `apps/web/app/studio/live/[sessionId]/page.tsx`

### 概要

現在の Socket.IO + 自前 WebRTC 実装を `livekit-client` SDK に置換する。

### 主な変更

1. **Socket.IO 関連コードの削除**: `socket.io-client` の import、接続管理、イベントハンドラ
2. **RTCPeerConnection 関連コードの削除**: offer/answer/ICE candidate 管理
3. **LiveKit SDK に置換**:

```typescript
import { Room, RoomEvent, Track } from "livekit-client";

// 1. トークン取得
const res = await fetch("/api/livekit/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId, requestedRole: "vtuber" }),
});
const { token, livekitUrl, roomName } = await res.json();

// 2. Room 接続
const room = new Room();
await room.connect(livekitUrl, token);

// 3. カメラ + マイクを publish
await room.localParticipant.enableCameraAndMicrophone();

// 4. リモート参加者（スピーカー）のトラックを受信
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.kind === Track.Kind.Audio) {
    const audioElement = track.attach();
    document.body.appendChild(audioElement);
  }
});

// 5. Egress 開始（配信ボタン押下時）
await fetch("/api/livekit/egress", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId, action: "start" }),
});

// 6. 配信停止
await fetch("/api/livekit/egress", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId, action: "stop" }),
});

// 7. 切断
room.disconnect();
```

### 既存の状態管理との対応

| 現在 | LiveKit 後 |
|------|-----------|
| `connectionStatus` state | `room.state` + `RoomEvent.ConnectionStateChanged` |
| `startBroadcast()` | `room.connect()` + `enableCameraAndMicrophone()` |
| `stopBroadcast()` | `room.disconnect()` |
| `isMuted` toggle | `room.localParticipant.setMicrophoneEnabled(bool)` |
| WebRTC reconnection | LiveKit SDK 内蔵の自動再接続 |

### 代替: `@livekit/components-react` を使う場合

```tsx
import { LiveKitRoom, VideoTrack, AudioTrack } from "@livekit/components-react";

<LiveKitRoom serverUrl={livekitUrl} token={token} connect={true}>
  {/* 自分のカメラプレビュー */}
  <VideoTrack source={Track.Source.Camera} />
  {/* スピーカーの音声 */}
  <AudioTrack source={Track.Source.Microphone} />
</LiveKitRoom>
```

---

## 2. 参加者ページ: `apps/web/app/room/[roomId]/page.tsx`

### ロール分岐

#### Speaker（スピーカー）

```typescript
import { Room, RoomEvent } from "livekit-client";

// 1. トークン取得
const res = await fetch("/api/livekit/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sessionId: roomId, requestedRole: "speaker" }),
});
const { token, livekitUrl } = await res.json();

// 2. Room 接続
const room = new Room();
await room.connect(livekitUrl, token);

// 3. マイクのみ publish（カメラなし）
await room.localParticipant.setMicrophoneEnabled(true);

// 4. VTuber の音声を受信（会話用）
room.on(RoomEvent.TrackSubscribed, (track) => {
  if (track.kind === Track.Kind.Audio) {
    const el = track.attach();
    document.body.appendChild(el);
  }
});
```

#### Listener（リスナー）

LiveKit には接続 **しない**。Cloudflare Stream HLS で視聴。

```typescript
import Hls from "hls.js";

// 1. セッション情報から HLS URL を取得
const res = await fetch(`/api/stream-sessions/${roomId}`);
const { session } = await res.json();
const hlsUrl = session.cfStreamHlsUrl;

// 2. HLS.js で再生
const videoElement = document.getElementById("player") as HTMLVideoElement;

if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(hlsUrl);
  hls.attachMedia(videoElement);
} else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
  // Safari はネイティブ HLS 対応
  videoElement.src = hlsUrl;
}
```

### 注意

- `role` は URL クエリパラメータ（`?role=speaker` or `?role=listener`）で受け取る（既存の動作を維持）
- リスナーは LiveKit トークンを取得しない → サーバー負荷なし
- HLS の遅延は通常 5-15 秒程度。LL-HLS を使えば 2-5 秒に短縮可能。

---

## 3. 削除可能なもの

LiveKit 移行完了後、以下は不要:

- `apps/web/app/lib/server/webrtcConfig.ts` — ICE サーバー設定
- `apps/web/app/api/webrtc/config/route.ts` — ICE 設定 API
- `socket.io-client` の依存
- `NEXT_PUBLIC_SIGNALING_URL` 環境変数
- `apps/signaling/` — シグナリングサーバー全体
