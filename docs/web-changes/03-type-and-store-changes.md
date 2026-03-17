# 型定義とストアの変更

## 1. `apps/web/app/lib/apiTypes.ts` — StreamSession 型の拡張

### 追加するフィールド（クライアントに公開）

```typescript
export type StreamSession = {
  // ... 既存フィールドはそのまま ...

  // LiveKit
  livekitRoomName?: string;

  // Cloudflare Stream（リスナー向け再生URL）
  cfStreamHlsUrl?: string;
  cfStreamDashUrl?: string;
};
```

### 注意

以下のフィールドはサーバー内部のみで使用し、クライアントには公開 **しない**:
- `cfStreamInputId` — CF Live Input の管理ID
- `cfStreamRtmpUrl` — RTMP 取り込みURL（秘匿）
- `cfStreamKey` — ストリームキー（秘匿）
- `livekitEgressId` — 実行中の Egress ID

---

## 2. `apps/web/app/lib/server/aimentStore.ts` — ストア変更

### 2a. 内部型の拡張

```typescript
// StoredStreamSession: StreamSession に加えてサーバー専用フィールドを持つ
type StoredStreamSession = StreamSession & {
  cfStreamInputId?: string;
  cfStreamRtmpUrl?: string;
  cfStreamKey?: string;
  livekitEgressId?: string;
};
```

### 2b. StoreFile の変更

```typescript
type StoreFile = {
  users: StoredUser[];
  streamSessions: StoredStreamSession[];  // StreamSession → StoredStreamSession
  reservations: Reservation[];
};
```

### 2c. `normalizeStreamSession()` の変更

既存の return 文に以下を追加:

```typescript
function normalizeStreamSession(entry: Partial<StoredStreamSession>): StoredStreamSession | null {
  // ... 既存のバリデーション ...

  return {
    // ... 既存フィールド ...

    // LiveKit / Cloudflare Stream（optional）
    livekitRoomName: typeof entry.livekitRoomName === "string" ? entry.livekitRoomName : undefined,
    cfStreamHlsUrl: typeof entry.cfStreamHlsUrl === "string" ? entry.cfStreamHlsUrl : undefined,
    cfStreamDashUrl: typeof entry.cfStreamDashUrl === "string" ? entry.cfStreamDashUrl : undefined,
    cfStreamInputId: typeof entry.cfStreamInputId === "string" ? entry.cfStreamInputId : undefined,
    cfStreamRtmpUrl: typeof entry.cfStreamRtmpUrl === "string" ? entry.cfStreamRtmpUrl : undefined,
    cfStreamKey: typeof entry.cfStreamKey === "string" ? entry.cfStreamKey : undefined,
    livekitEgressId: typeof entry.livekitEgressId === "string" ? entry.livekitEgressId : undefined,
  };
}
```

### 2d. サニタイズ関数

API レスポンスからサーバー専用フィールドを除外:

```typescript
function sanitizeStreamSession(session: StoredStreamSession): StreamSession {
  const {
    cfStreamInputId: _1,
    cfStreamRtmpUrl: _2,
    cfStreamKey: _3,
    livekitEgressId: _4,
    ...publicSession
  } = session;
  return publicSession;
}
```

既存の `listStreamSessions()`, `getStreamSessionById()` 等の return で `sanitizeStreamSession()` を通す。

### 2e. 新規関数

```typescript
/**
 * セッション開始時に LiveKit/CF フィールドを設定
 */
export async function updateStreamSessionLiveFields(
  sessionId: string,
  fields: {
    livekitRoomName: string;
    cfStreamInputId: string;
    cfStreamHlsUrl: string;
    cfStreamDashUrl: string;
    cfStreamRtmpUrl: string;
    cfStreamKey: string;
  },
) {
  return mutateStore((store) => {
    const index = store.streamSessions.findIndex((s) => s.sessionId === sessionId);
    if (index === -1) return null;
    store.streamSessions[index] = { ...store.streamSessions[index], ...fields };
    return sanitizeStreamSession(store.streamSessions[index]);
  });
}

/**
 * Egress ID をセッションに保存
 */
export async function setSessionEgressId(sessionId: string, egressId: string | null) {
  return mutateStore((store) => {
    const session = store.streamSessions.find((s) => s.sessionId === sessionId);
    if (!session) return null;
    session.livekitEgressId = egressId ?? undefined;
    return true;
  });
}

/**
 * セッション終了時にサーバー専用フィールドをクリア
 */
export async function clearStreamSessionLiveFields(sessionId: string) {
  return mutateStore((store) => {
    const session = store.streamSessions.find((s) => s.sessionId === sessionId);
    if (!session) return null;
    delete session.cfStreamRtmpUrl;
    delete session.cfStreamKey;
    delete session.livekitEgressId;
    return true;
  });
}

/**
 * Egress API ルートで使用: サーバー専用フィールド含むセッション取得
 */
export async function getStoredStreamSession(sessionId: string) {
  const store = await readStore();
  return store.streamSessions.find((s) => s.sessionId === sessionId) ?? null;
}
```

---

## 3. `cloneStore()` の変更

型を合わせる（`StreamSession[]` → `StoredStreamSession[]`）:

```typescript
function cloneStore(store: StoreFile): StoreFile {
  return {
    users: [...store.users],
    streamSessions: [...store.streamSessions],
    reservations: [...store.reservations],
  };
}
```

（実装は同じだが、型が変わるので TypeScript が整合する）
