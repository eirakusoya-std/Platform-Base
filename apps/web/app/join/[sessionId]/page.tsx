"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? "";

  const session = useMemo<SessionMeta>(
    () =>
      SESSION_MAP[sessionId] ?? {
        id: sessionId || "unknown",
        vtuber: "特別セッション",
        title: "参加前チェック",
        description: "このセッションに参加する前に、カメラとマイクを確認してください。",
        duration: "約60分",
        participationType: "先着順",
        thumbnail: "/image/thumbnail/thumbnail_4.png",
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
    const roomId = `session-${encodeURIComponent(session.id)}`;
    const query = new URLSearchParams({ mic: micOn ? "1" : "0", cam: camOn ? "1" : "0", speaker: speakerOn ? "1" : "0" }).toString();
    router.push(`/room/${roomId}?${query}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-5 lg:px-12">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#1e3a5f] text-xs font-bold text-white">A</div>
            <span className="text-lg font-medium tracking-wide">aiment</span>
          </button>
          <p className="text-sm text-gray-500">参加前チェック</p>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 px-8 py-8 lg:grid-cols-5 lg:px-12">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-[#1e3a5f]">カメラ・マイク確認</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {ready ? "準備OK" : "準備中"}
            </span>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50" style={{ aspectRatio: "16/9" }}>
            <video ref={previewRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-sm font-medium text-white">カメラはオフです</div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500">マイク入力レベル</p>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-[#1e3a5f] transition-all" style={{ width: `${micOn ? micLevel : 0}%` }} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${micOn ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-gray-300 text-gray-700 hover:border-gray-400"}`}
              onClick={() => applyMic(!micOn)}
            >
              {micOn ? "🎤 マイク ON" : "🎤 マイク OFF"}
            </button>
            <button
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${camOn ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-gray-300 text-gray-700 hover:border-gray-400"}`}
              onClick={() => applyCam(!camOn)}
            >
              {camOn ? "📷 カメラ ON" : "📷 カメラ OFF"}
            </button>
            <button
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${speakerOn ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-gray-300 text-gray-700 hover:border-gray-400"}`}
              onClick={() => setSpeakerOn((prev) => !prev)}
            >
              {speakerOn ? "🔊 スピーカー ON" : "🔊 スピーカー OFF"}
            </button>
          </div>

          {errorMessage && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>}
        </section>

        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 overflow-hidden rounded-xl border border-gray-200" style={{ aspectRatio: "16/10" }}>
            <img src={session.thumbnail} alt={session.vtuber} className="h-full w-full object-cover" />
          </div>
          <h2 className="mb-1 text-lg font-bold text-gray-900">{session.title}</h2>
          <p className="mb-4 text-sm font-medium text-[#1e3a5f]">{session.vtuber}</p>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">配信時間</p>
              <p className="font-semibold text-gray-900">{session.duration}</p>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">参加方式</p>
              <p className="font-semibold text-gray-900">{session.participationType}</p>
            </div>
            <div className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-3 text-xs leading-relaxed text-purple-800">{session.description}</div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => router.push("/")}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400"
            >
              戻る
            </button>
            <button
              onClick={joinNow}
              disabled={!ready || !!errorMessage}
              className="flex-1 rounded-xl bg-[#1e3a5f] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#2d5080] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              この設定で参加
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
