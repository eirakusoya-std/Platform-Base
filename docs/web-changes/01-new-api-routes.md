# 新規 API ルート: LiveKit トークン発行 + Egress 制御

## 1. `apps/web/app/api/livekit/token/route.ts`

LiveKit Cloud 接続用のトークンを発行するエンドポイント。

### エンドポイント

```
POST /api/livekit/token
Content-Type: application/json
Cookie: aiment_dev_session=<userId>
```

### リクエストボディ

```typescript
{
  sessionId: string;          // 配信セッションID
  requestedRole: "vtuber" | "speaker";
}
```

### レスポンス

```typescript
{
  token: string;              // LiveKit JWT トークン
  livekitUrl: string;         // wss://xxx.livekit.cloud
  roomName: string;           // = sessionId
}
```

### 実装コード

```typescript
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import { getStreamSessionById } from "@/app/lib/server/aimentStore";
import { createVtuberToken, createSpeakerToken } from "@repo/livekit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUser();
    const body = (await request.json()) as {
      sessionId: string;
      requestedRole: "vtuber" | "speaker";
    };

    const session = await getStreamSessionById(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status !== "live") {
      return NextResponse.json({ error: "Session is not live" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const roomName = session.sessionId;

    if (body.requestedRole === "vtuber") {
      if (actor.role !== "vtuber" || actor.id !== session.hostUserId) {
        return NextResponse.json(
          { error: "Not authorized as VTuber for this session" },
          { status: 403 },
        );
      }
      const token = await createVtuberToken({
        apiKey,
        apiSecret,
        roomName,
        userId: actor.id,
        userName: actor.name,
      });
      return NextResponse.json({
        token,
        livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
        roomName,
      });
    }

    if (body.requestedRole === "speaker") {
      // TODO: canAccessSessionPlan チェックを追加
      // TODO: スピーカー枠数チェック（最大5人）
      const token = await createSpeakerToken({
        apiKey,
        apiSecret,
        roomName,
        userId: actor.id,
        userName: actor.name,
      });
      return NextResponse.json({
        token,
        livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
        roomName,
      });
    }

    return NextResponse.json({ error: "Invalid requestedRole" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

---

## 2. `apps/web/app/api/livekit/egress/route.ts`

VTuber の映像+音声を Cloudflare Stream に RTMP 配信するための Egress 制御。

### エンドポイント

```
POST /api/livekit/egress
Content-Type: application/json
Cookie: aiment_dev_session=<userId>
```

### リクエストボディ

```typescript
{
  sessionId: string;
  action: "start" | "stop";
}
```

### レスポンス

```typescript
// start
{ ok: true, egressId: string }

// stop
{ ok: true }
```

### 実装コード

```typescript
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import { getStreamSessionById } from "@/app/lib/server/aimentStore";
import { startVtuberEgress, stopEgress } from "@repo/livekit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUser();
    if (actor.role !== "vtuber") {
      return NextResponse.json({ error: "VTuber only" }, { status: 403 });
    }

    const body = (await request.json()) as {
      sessionId: string;
      action: "start" | "stop";
    };

    const session = await getStreamSessionById(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.hostUserId !== actor.id) {
      return NextResponse.json({ error: "Not your session" }, { status: 403 });
    }

    const host = process.env.NEXT_PUBLIC_LIVEKIT_URL!.replace("wss://", "https://");
    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;

    if (body.action === "start") {
      if (session.status !== "live") {
        return NextResponse.json({ error: "Session is not live" }, { status: 400 });
      }

      // cfStreamRtmpUrl と cfStreamKey は session start 時に保存済み
      // → 03-type-and-store-changes.md 参照
      const storedSession = session as typeof session & {
        cfStreamRtmpUrl?: string;
        cfStreamKey?: string;
      };

      if (!storedSession.cfStreamRtmpUrl || !storedSession.cfStreamKey) {
        return NextResponse.json(
          { error: "Cloudflare Stream not configured for this session" },
          { status: 400 },
        );
      }

      const rtmpUrl = `${storedSession.cfStreamRtmpUrl}${storedSession.cfStreamKey}`;

      const egressId = await startVtuberEgress({
        apiKey,
        apiSecret,
        host,
        roomName: session.sessionId,
        rtmpUrl,
        vtuberIdentity: actor.id,
      });

      // TODO: mutateStore で egressId をセッションに保存
      // session.livekitEgressId = egressId;

      return NextResponse.json({ ok: true, egressId });
    }

    if (body.action === "stop") {
      const storedSession = session as typeof session & {
        livekitEgressId?: string;
      };

      if (!storedSession.livekitEgressId) {
        return NextResponse.json({ error: "No active egress" }, { status: 400 });
      }

      await stopEgress({
        apiKey,
        apiSecret,
        host,
        egressId: storedSession.livekitEgressId,
      });

      // TODO: mutateStore で egressId をクリア

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Egress operation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

---

## 依存追加

`apps/web/package.json` に追加:

```json
{
  "dependencies": {
    "@repo/livekit": "workspace:*"
  }
}
```
