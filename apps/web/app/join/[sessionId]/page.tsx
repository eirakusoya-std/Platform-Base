"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "../../lib/i18n";
import { getStreamSession } from "../../lib/streamSessions";

type SessionMeta = {
 id: string;
 vtuber: string;
 title: string;
 description: string;
 duration: string;
 participationType: "先着順" | "抽選制" | "メンバー限定";
 thumbnail: string;
};

const SESSION_MAP: Record<string, SessionMeta> = {
 "1": {
 id: "1",
 vtuber: "夜城ルミナ",
 title: "【侵食エンド世界】リスナー参加型サバイバル建国計画",
 description: "エンドに侵食された異変ワールドで、リスナーと協力しながら文明を再建する長期マイクラ企画。",
 duration: "約120分",
 participationType: "抽選制",
 thumbnail: "/image/thumbnail/thumbnail_1.png",
 },
 "2": {
 id: "2",
 vtuber: "焔角リゼル",
 title: "【完全初見】DARK SOULS 制覇への血路",
 description: "死にゲー未経験の悪魔系VTuberが、視聴者の助言と悲鳴に包まれながらダクソを本気攻略。",
 duration: "約75分",
 participationType: "先着順",
 thumbnail: "/image/thumbnail/thumbnail_2.png",
 },
 "3": {
 id: "3",
 vtuber: "白雪ノエルナ",
 title: "まったり夜カフェ雑談",
 description: "コーヒー片手に、日常の話や最近の悩み、裏話をゆるく語る定期リラックス配信。",
 duration: "約90分",
 participationType: "メンバー限定",
 thumbnail: "/image/thumbnail/thumbnail_3.png",
 },
 "10": {
 id: "10",
 vtuber: "陽葵エルナ",
 title: "【今日から話せる】初心者向け英会話ライブレッスン",
 description: "発音・リアルな会話例・そのまま使えるテンプレをセットで学び、コメント参加型でその場アウトプットまでやる英語配信。",
 duration: "約60分",
 participationType: "先着順",
 thumbnail: "/image/thumbnail/thumbnail_5.png",
 },
 "11": {
 id: "11",
 vtuber: "星宮ポラリス ＆ 桜庭メイカ",
 title: "視聴者参加型！ガチレース耐久",
 description: "フレンド戦で視聴者と本気レース、ポイント制で罰ゲームありの白熱コラボ配信。",
 duration: "約90分",
 participationType: "抽選制",
 thumbnail: "/image/thumbnail/thumbnail_4.png",
 },
};

export default function PreJoinPage() {
 const router = useRouter();
 const { tx } = useI18n();
 const params = useParams<{ sessionId: string }>();
 const sessionId = params?.sessionId ?? "";

 const session = useMemo<SessionMeta>(
 () => {
 const dynamicSession = getStreamSession(sessionId);
 if (dynamicSession) {
 return {
 id: dynamicSession.sessionId,
 vtuber: dynamicSession.hostName,
 title: dynamicSession.title,
 description: dynamicSession.description,
 duration: dynamicSession.status === "live" ? "配信中" : "約60分",
 participationType: dynamicSession.participationType === "Lottery" ? "抽選制" : "先着順",
 thumbnail: dynamicSession.thumbnail,
 };
 }

 return (
 SESSION_MAP[sessionId] ?? {
 id: sessionId || "unknown",
 vtuber: "特別セッション",
 title: "参加前チェック",
 description: "このセッションに参加する前に、カメラとマイクを確認してください。",
 duration: "約60分",
 participationType: "先着順",
 thumbnail: "/image/thumbnail/thumbnail_4.png",
 }
 );
 },
 [sessionId],
 );

 const previewRef = useRef<HTMLVideoElement | null>(null);
 const streamRef = useRef<MediaStream | null>(null);

 const [micOn, setMicOn] = useState(true);
 const [camOn, setCamOn] = useState(true);
 const [speakerOn, setSpeakerOn] = useState(true);
 const [ready, setReady] = useState(false);
 const [errorMessage, setErrorMessage] = useState<string | null>(null);
 const [micLevel, setMicLevel] = useState(0);

 useEffect(() => {
 let mounted = true;
 let audioContext: AudioContext | null = null;
 let analyser: AnalyserNode | null = null;
 let source: MediaStreamAudioSourceNode | null = null;
 let meterTimer: number | null = null;

 const setup = async () => {
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
 if (!mounted) {
 stream.getTracks().forEach((track) => track.stop());
 return;
 }

 streamRef.current = stream;
 if (previewRef.current) {
 previewRef.current.srcObject = stream;
 previewRef.current.muted = true;
 }

 audioContext = new AudioContext();
 analyser = audioContext.createAnalyser();
 analyser.fftSize = 256;
 source = audioContext.createMediaStreamSource(stream);
 source.connect(analyser);
 const data = new Uint8Array(analyser.frequencyBinCount);

 meterTimer = window.setInterval(() => {
 if (!analyser) return;
 analyser.getByteFrequencyData(data);
 const average = data.reduce((sum, value) => sum + value, 0) / data.length;
 setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
 }, 120);

 setReady(true);
 setErrorMessage(null);
 } catch {
 setErrorMessage("カメラまたはマイクの利用が許可されていません。ブラウザ設定を確認してください。");
 setReady(false);
 }
 };

 setup();

 return () => {
 mounted = false;
 if (meterTimer) window.clearInterval(meterTimer);
 source?.disconnect();
 analyser?.disconnect();
 audioContext?.close().catch(() => {
 // no-op
 });
 streamRef.current?.getTracks().forEach((track) => track.stop());
 streamRef.current = null;
 };
 }, []);

 useEffect(() => {
 streamRef.current?.getAudioTracks().forEach((track) => {
 track.enabled = micOn;
 });
 streamRef.current?.getVideoTracks().forEach((track) => {
 track.enabled = camOn;
 });
 }, [micOn, camOn]);

 const applyMic = (enabled: boolean) => {
 streamRef.current?.getAudioTracks().forEach((track) => {
 track.enabled = enabled;
 });
 setMicOn(enabled);
 };

 const applyCam = (enabled: boolean) => {
 streamRef.current?.getVideoTracks().forEach((track) => {
 track.enabled = enabled;
 });
 setCamOn(enabled);
 };

 const joinNow = () => {
 const roomId = encodeURIComponent(session.id);
 const query = new URLSearchParams({ mic: micOn ? "1" : "0", cam: camOn ? "1" : "0", speaker: speakerOn ? "1" : "0" }).toString();
 router.push(`/room/${roomId}?${query}`);
 };

 return (
 <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
 <header className=" bg-[var(--brand-bg-900)]">
 <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-5 lg:px-12">
 <button onClick={() => router.push("/")} className="flex items-center gap-2">
 <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--brand-primary)] text-xs font-bold text-[var(--brand-bg-900)]">A</div>
 <span className="text-lg font-medium tracking-wide text-[var(--brand-text)]">aiment</span>
 </button>
 <p className="text-sm text-[var(--brand-text-muted)]">{tx("参加前チェック", "Pre-join Check")}</p>
 </div>
 </header>

 <main className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[1fr_420px] lg:px-8">
 <section className="min-w-0 space-y-4">
 <div className="overflow-hidden rounded-2xl bg-black shadow-xl">
 <div className="relative" style={{ aspectRatio: "16/9" }}>
 <img src={session.thumbnail} alt={session.vtuber} className="h-full w-full object-cover" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
 <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold">配信企画</div>
 <div className="absolute bottom-4 left-4 right-4">
 <h1 className="line-clamp-2 text-2xl font-bold leading-tight text-[var(--brand-text)] lg:text-3xl">{session.title}</h1>
 <p className="mt-2 text-sm text-[var(--brand-text-muted)]">{session.vtuber}</p>
 </div>
 </div>
 </div>

 <div className="rounded-2xl bg-[var(--brand-bg-800)] p-5">
 <h2 className="mb-3 text-sm font-semibold tracking-wide text-[var(--brand-text-muted)]">{tx("企画の概要", "Overview")}</h2>
 <p className="mb-4 text-sm leading-relaxed text-[var(--brand-text)]">{session.description}</p>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 <div className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
 <p className="text-xs text-[var(--brand-text-muted)]">{tx("配信時間", "Duration")}</p>
 <p className="text-sm font-semibold text-[var(--brand-text)]">{session.duration}</p>
 </div>
 <div className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
 <p className="text-xs text-[var(--brand-text-muted)]">{tx("参加方式", "Entry Type")}</p>
 <p className="text-sm font-semibold text-[var(--brand-text)]">{session.participationType}</p>
 </div>
 </div>
 </div>
 </section>

 <aside className="rounded-2xl bg-[var(--brand-bg-800)] p-5">
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-sm font-semibold tracking-wide text-[var(--brand-text-muted)]">{tx("デバイス確認", "Device Check")}</h2>
 <span
 className={`rounded-full px-3 py-1 text-xs font-semibold ${ready ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]"}`}
 >
 {ready ? tx("準備OK", "Ready") : tx("準備中", "Preparing")}
 </span>
 </div>

 <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16/10" }}>
 <video ref={previewRef} autoPlay playsInline muted className="h-full w-full object-cover" />
 {!camOn && (
 <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm font-medium text-[var(--brand-text)]">{tx("カメラはオフです", "Camera is off")}</div>
 )}
 </div>

 <div className="mt-4 rounded-xl bg-[var(--brand-bg-900)] p-4">
 <p className="mb-2 text-xs font-medium text-[var(--brand-text-muted)]">{tx("マイク入力レベル", "Mic input level")}</p>
 <div className="h-2 overflow-hidden rounded-full bg-[var(--brand-bg-900)]">
 <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all" style={{ width: `${micOn ? micLevel : 0}%` }} />
 </div>
 </div>

 <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
 <button
 className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
 micOn
 ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
 : " text-[var(--brand-text-muted)] "
 }`}
 onClick={() => applyMic(!micOn)}
 >
 {micOn ? tx("MIC ON", "MIC ON") : tx("MIC OFF", "MIC OFF")}
 </button>
 <button
 className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
 camOn
 ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
 : " text-[var(--brand-text-muted)] "
 }`}
 onClick={() => applyCam(!camOn)}
 >
 {camOn ? tx("CAM ON", "CAM ON") : tx("CAM OFF", "CAM OFF")}
 </button>
 <button
 className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
 speakerOn
 ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]"
 : " text-[var(--brand-text-muted)] "
 }`}
 onClick={() => setSpeakerOn((prev) => !prev)}
 >
 {speakerOn ? tx("SPK ON", "SPK ON") : tx("SPK OFF", "SPK OFF")}
 </button>
 </div>

 {errorMessage && <p className="mt-4 rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">{errorMessage}</p>}

 <div className="mt-6 flex gap-2">
 <button
 onClick={() => router.push("/")}
 className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-primary)]"
 >
 {tx("戻る", "Back")}
 </button>
 <button
 onClick={joinNow}
 disabled={!ready || !!errorMessage}
 className="flex-1 rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-[var(--brand-bg-900)] transition-colors hover:bg-[var(--brand-primary)] disabled:cursor-not-allowed disabled:bg-[var(--brand-text-muted)]"
 >
 {tx("この設定で参加", "Join with this setup")}
 </button>
 </div>
 </aside>
 </main>
 </div>
 );
}
