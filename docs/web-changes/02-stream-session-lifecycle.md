# セッションライフサイクルの変更

## 1. セッション開始: `apps/web/app/api/stream-sessions/[sessionId]/start/route.ts`

### 現在の実装

```typescript
const session = await setStreamSessionStatus(sessionId, actor, "live");
return NextResponse.json({ session });
```

### 変更後

```typescript
import { createCfLiveInput, ensureRoomExists } from "@repo/livekit";

export async function POST(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const actor = await requireSessionUser();
    const { sessionId } = await context.params;

    // 1. 既存: ステータスを "live" に変更
    const session = await setStreamSessionStatus(sessionId, actor, "live");
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 2. 新規: Cloudflare Stream Live Input を作成
    const cfInput = await createCfLiveInput({
      accountId: process.env.CF_ACCOUNT_ID!,
      apiToken: process.env.CF_STREAM_API_TOKEN!,
      name: session.title,
    });

    // 3. 新規: LiveKit room を作成
    const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL!.replace("wss://", "https://");
    await ensureRoomExists({
      apiKey: process.env.LIVEKIT_API_KEY!,
      apiSecret: process.env.LIVEKIT_API_SECRET!,
      host: livekitHost,
      roomName: sessionId,
      maxParticipants: 6,  // VTuber + 5 speakers
    });

    // 4. 新規: セッションに LiveKit/CF 情報を保存
    //    → updateStreamSessionLiveFields() を aimentStore に追加する必要あり
    //    → 03-type-and-store-changes.md 参照
    const updatedSession = await updateStreamSessionLiveFields(sessionId, {
      livekitRoomName: sessionId,
      cfStreamInputId: cfInput.inputId,
      cfStreamHlsUrl: cfInput.hlsUrl,
      cfStreamDashUrl: cfInput.dashUrl,
      cfStreamRtmpUrl: cfInput.rtmpUrl,
      cfStreamKey: cfInput.streamKey,
    });

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

---

## 2. セッション終了: `apps/web/app/api/stream-sessions/[sessionId]/end/route.ts`

### 現在の実装

```typescript
const session = await setStreamSessionStatus(sessionId, actor, "ended");
return NextResponse.json({ session });
```

### 変更後

```typescript
import { stopEgress, deleteCfLiveInput } from "@repo/livekit";

export async function POST(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const actor = await requireSessionUser();
    const { sessionId } = await context.params;

    // 先にセッション情報を取得（egressId, cfStreamInputId が必要）
    const currentSession = await getStreamSessionById(sessionId);

    // 1. 新規: Egress を停止（実行中の場合）
    if (currentSession?.livekitEgressId) {
      try {
        const host = process.env.NEXT_PUBLIC_LIVEKIT_URL!.replace("wss://", "https://");
        await stopEgress({
          apiKey: process.env.LIVEKIT_API_KEY!,
          apiSecret: process.env.LIVEKIT_API_SECRET!,
          host,
          egressId: currentSession.livekitEgressId,
        });
      } catch {
        // Egress が既に停止している場合は無視
      }
    }

    // 2. 既存: ステータスを "ended" に変更
    const session = await setStreamSessionStatus(sessionId, actor, "ended");
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 3. 新規: LiveKit/CF フィールドをクリア
    //    注: CF Live Input は削除しない（VOD として残す）
    //    削除したい場合は deleteCfLiveInput() を呼ぶ
    await clearStreamSessionLiveFields(sessionId);

    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to end session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

---

## 注意事項

- `updateStreamSessionLiveFields()` と `clearStreamSessionLiveFields()` は `aimentStore.ts` に新規追加が必要（→ 03-type-and-store-changes.md 参照）
- CF Live Input を session end 時に削除するかは運用判断。VOD（録画）を残すなら削除しない。
- LiveKit room は参加者が全員退出すれば `emptyTimeout` 後に自動削除される。
