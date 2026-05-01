import Image from "next/image";

const cell = (name: string) => `/lp/cells/${name}.png`;
const edited = (name: string) => `/lp/edited/${name}`;

const navItems = ["Concept", "How it Works", "Contents", "FAQ"];

const contentExamples = [
  {
    image: "cell_22",
    title: "リアルタイムトーク",
    body: "テキストや音声で、その場で会話を楽しめます。",
  },
  {
    image: "cell_23",
    title: "ギフト&リアクション",
    body: "ギフトやリアクションで、想いをカタチに伝えよう。",
  },
  {
    image: "cell_24",
    title: "特別に名前を呼ばれる",
    body: "あなたの名前が呼ばれるかも!? 一生の思い出になる瞬間を。",
  },
  {
    image: "cell_25",
    title: "イベント&コラボ",
    body: "限定イベントやコラボ配信など、特別な体験が盛りだくさん。",
  },
  {
    image: "cell_26",
    title: "コミュニティ",
    body: "同じ推しを応援する仲間とつながれる!",
  },
];

const fanAvatars = ["cell_30", "cell_31", "cell_34"];
const vtuberAvatars = ["cell_32", "cell_33", "cell_35"];

function JoinButton({ light = false }: { light?: boolean }) {
  return (
    <a className={light ? "join-button join-button-light" : "join-button"} href="/auth/signup">
      <span>Join Now</span>
      <span className="join-arrow">→</span>
    </a>
  );
}

function SpeechBubble({
  className,
  text,
  fill,
  color,
  width,
}: {
  className: string;
  text: string;
  fill: string;
  color: string;
  width: number;
}) {
  const bodyRight = width - 4;
  const tailTipX = width - 10;
  const tailTipY = 82;
  const tailBaseRight = width - 26;
  const tailBaseLeft = width - 58;
  const bubblePath = [
    `M32 4H${width - 36}`,
    `C${width - 18} 4 ${bodyRight} 18 ${bodyRight} 34`,
    `C${bodyRight} 49 ${width - 18} 60 ${tailBaseRight} 62`,
    `L${tailTipX} ${tailTipY}`,
    `L${tailBaseLeft} 61`,
    "H32",
    "C15 61 4 49 4 33",
    "C4 17 15 4 32 4Z",
  ].join(" ");

  return (
    <svg className={`hero-bubble-svg ${className}`} viewBox={`0 0 ${width} 88`} aria-hidden>
      <path
        d={bubblePath}
        fill={fill}
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <text
        x={width / 2}
        y="33"
        dominantBaseline="middle"
        textAnchor="middle"
        fill={color}
        fontFamily="var(--font-latin)"
        fontSize="17"
        fontWeight="600"
      >
        {text}
      </text>
    </svg>
  );
}

function DecorativeDots() {
  return (
    <>
      <Image className="deco deco-a" src={cell("cell_15")} alt="" width={166} height={72} aria-hidden />
      <Image className="deco deco-b" src={cell("cell_16")} alt="" width={161} height={72} aria-hidden />
      <Image className="deco deco-c" src={cell("cell_19")} alt="" width={138} height={72} aria-hidden />
      <Image className="deco deco-d" src={cell("cell_21")} alt="" width={333} height={72} aria-hidden />
      <Image className="deco deco-e" src={cell("cell_43")} alt="" width={333} height={65} aria-hidden />
    </>
  );
}

export default function LandingPage() {
  return (
    <main className="lp-page">
      <DecorativeDots />

      <header className="lp-header">
        <a className="brand" href="#top" aria-label="aiment home">
          <Image src="/logo/aiment_logotype.svg" alt="aiment" width={150} height={50} priority />
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`}>
              {item}
            </a>
          ))}
        </nav>
        <JoinButton />
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">VTUBER × REALTIME TALK</p>
          <h1>
            <b className="beyond-word">
              bey<i className="chat-o" aria-hidden />nd
            </b>
            <br />
            chat.
          </h1>
          <h2>推しと、もっと先の関係へ。</h2>
          <p className="lead">
            海外ファンと日本のVTuberが
            <br />
            リアルタイムでつながるプラットフォーム。
            <br />
            ただ見るだけじゃない、あなたが主役の時間。
          </p>
          <div className="hero-actions">
            <JoinButton />
          </div>
        </div>

        <div className="hero-art" aria-label="VTuber and fan messages">
          <div className="hero-character">
            <Image className="hero-character-mask" src={edited("LPchara.svg")} alt="" width={669} height={746} priority aria-hidden />
            <Image className="hero-character-image" src={edited("aiment_LPchara.png")} alt="beyond chat VTuber" width={604} height={881} priority />
          </div>
          <SpeechBubble className="bubble-blue" text="Hi!" fill="#eaf2ff" color="#376df4" width={112} />
          <SpeechBubble className="bubble-yellow" text="Can I join?" fill="#ffe680" color="#062a63" width={178} />
          <SpeechBubble className="bubble-dark" text="Nice to meet you!" fill="#062a63" color="#ffffff" width={226} />
          <SpeechBubble className="bubble-pink" text="Thank you!" fill="#ffffff" color="#ff5b7d" width={166} />
          <div className="vtuber-row">
            {vtuberAvatars.map((avatar) => (
              <Image key={avatar} src={cell(avatar)} alt="" width={52} height={52} />
            ))}
          </div>
        </div>
      </section>

      <section className="concept" id="concept">
        <div className="concept-inner">
          <div className="section-copy">
            <p className="section-kicker">CONCEPT</p>
            <h2>
              ここは、視聴を超えた
              <br />
              特別なつながりが生まれる場所。
            </h2>
            <p>
              リアルタイムで会話して、想いを伝えて、認知される。
              <br />
              あなたの一言が、配信の流れを変えるかもしれない。
              <br />
              推しとの距離がぐっと縮まる、かけがえのない体験を。
            </p>
            <Image className="concept-map" src={cell("cell_07")} alt="You and VTuber connection map" width={333} height={156} />
          </div>
          <div className="concept-visual">
            <Image src={cell("cell_04")} alt="Fan and VTuber talking" width={164} height={156} />
          </div>
        </div>
      </section>

      <section className="steps" id="how-it-works">
        <p className="section-kicker">HOW IT WORKS</p>
        <h2>3ステップで、推しともっと近くに。</h2>
        <div className="step-grid">
          <article>
            <span className="step-number">01</span>
            <Image src={cell("cell_27")} alt="" width={149} height={123} />
            <p>簡単登録で、すぐに参加の準備ができます。</p>
          </article>
          <article>
            <span className="step-number">02</span>
            <Image src={cell("cell_28")} alt="" width={333} height={123} />
            <p>リアルタイムで会話に参加! コメントや音声で想いを届けよう。</p>
          </article>
          <article>
            <span className="step-number">03</span>
            <Image src={cell("cell_29")} alt="" width={166} height={109} />
            <p>名前を呼ばれたり、反応がもらえたり。あなたが特別な存在に。</p>
          </article>
        </div>
      </section>

      <section className="lp-contents" id="contents">
        <p className="section-kicker">CONTENTS EXAMPLES</p>
        <h2>いろんな形で、特別な時間を。</h2>
        <div className="content-grid">
          {contentExamples.map((item) => (
            <article key={item.title}>
              <div className="content-figure" aria-hidden>
                <Image src={cell(item.image)} alt="" width={166} height={156} />
              </div>
              <div className="content-text">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta">
        <div className="cta-copy">
          <h2>
            推しとの未来は、
            <br />
            ここから始まる。
          </h2>
          <p>さあ、あなたも特別な体験を。</p>
          <JoinButton light />
        </div>
        <div className="cta-people" aria-hidden>
          <Image className="bubble-amazing" src={cell("cell_11")} alt="" width={159} height={95} />
          <Image className="bubble-see" src={cell("cell_12")} alt="" width={138} height={95} />
          <Image className="bubble-you" src={cell("cell_13")} alt="" width={149} height={95} />
          {[...fanAvatars, "cell_32", "cell_35"].map((avatar) => (
            <Image key={avatar} src={cell(avatar)} alt="" width={110} height={110} />
          ))}
        </div>
      </section>

      <footer className="lp-footer" id="faq">
        <a className="brand brand-footer" href="#top" aria-label="aiment home">
          <Image src="/logo/aiment_logotype.svg" alt="aiment" width={150} height={50} />
        </a>
        <nav aria-label="Footer navigation">
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`}>
              {item}
            </a>
          ))}
        </nav>
        <div className="socials" aria-label="Social links">
          <a href="#" aria-label="X">𝕏</a>
          <a href="#" aria-label="YouTube">▶</a>
          <a href="#" aria-label="Discord">◎</a>
        </div>
      </footer>
    </main>
  );
}
