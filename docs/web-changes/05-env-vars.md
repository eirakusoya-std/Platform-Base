# 環境変数の追加

## 新規追加（必須）

`apps/web/.env.local` および Vercel プロジェクト設定に追加:

```bash
# === LiveKit Cloud ===
# LiveKit Cloud のプロジェクト設定 → Keys から取得
LIVEKIT_API_KEY=APIxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# LiveKit Cloud の Project URL（ブラウザ SDK が接続する先）
# NEXT_PUBLIC_ プレフィックスでクライアントにも公開
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project-id.livekit.cloud

# === Cloudflare Stream ===
# Cloudflare ダッシュボード → Account ID
CF_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Cloudflare API トークン（Stream:Edit 権限が必要）
# ダッシュボード → API Tokens → Create Token
CF_STREAM_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Vercel での設定

1. Vercel ダッシュボード → プロジェクト → Settings → Environment Variables
2. 以下をすべて追加:
   - `LIVEKIT_API_KEY` — サーバーサイドのみ
   - `LIVEKIT_API_SECRET` — サーバーサイドのみ
   - `NEXT_PUBLIC_LIVEKIT_URL` — クライアント+サーバー
   - `CF_ACCOUNT_ID` — サーバーサイドのみ
   - `CF_STREAM_API_TOKEN` — サーバーサイドのみ

## LiveKit Cloud セットアップ手順

1. https://cloud.livekit.io でアカウント作成
2. 新規プロジェクト作成
3. Settings → Keys でAPI Key / Secret を取得
4. Project URL を確認（`wss://xxx.livekit.cloud`）

## Cloudflare Stream セットアップ手順

1. Cloudflare ダッシュボード → Stream
2. Account ID を確認
3. API Tokens → Create Token → Stream:Edit 権限で作成

## `.env.example` への追記

```bash
# LiveKit Cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
NEXT_PUBLIC_LIVEKIT_URL=

# Cloudflare Stream
CF_ACCOUNT_ID=
CF_STREAM_API_TOKEN=
```

## 不要になる環境変数（移行完了後）

```bash
# WebRTC ICE（LiveKit が内部で処理）
# AIMENT_STUN_URLS=
# AIMENT_TURN_URLS=
# AIMENT_TURN_USERNAME=
# AIMENT_TURN_CREDENTIAL=
# AIMENT_TURN_CREDENTIAL_TYPE=

# シグナリングサーバー（LiveKit に置換）
# NEXT_PUBLIC_SIGNALING_URL=
```
