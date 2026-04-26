import Image from "next/image";

const cell = (name: string) => `/lp/cells/${name}.png`;

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
        <a className="brand" href="#top" aria-label="beyond chat home">
          <span className="brand-mark">
            <span />
            <span />
          </span>
          <span className="brand-copy">
            <strong>beyond chat</strong>
            <small>talk more, be more.</small>
          </span>
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
              bey<i className="chat-o">o</i>nd
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
            <div className="fans">
              <div className="avatar-row">
                {fanAvatars.map((avatar) => (
                  <Image key={avatar} src={cell(avatar)} alt="" width={52} height={52} />
                ))}
              </div>
              <strong>10,000+</strong>
              <span>Global Fans are here!</span>
            </div>
          </div>
        </div>

        <div className="hero-art" aria-label="VTuber and fan messages">
          <Image className="hero-blob" src={cell("cell_03")} alt="" width={166} height={156} priority />
          <Image className="chat chat-blue" src={cell("cell_08")} alt="" width={166} height={95} />
          <Image className="chat chat-yellow" src={cell("cell_09")} alt="" width={161} height={95} />
          <Image className="chat chat-dark" src={cell("cell_10")} alt="" width={164} height={95} />
          <Image className="chat chat-thanks" src={cell("cell_13")} alt="" width={149} height={95} />
          <div className="mascot">
            <Image src={cell("cell_32")} alt="beyond chat VTuber" width={164} height={109} priority />
          </div>
          <Image className="heart-bubble" src={cell("cell_14")} alt="" width={333} height={95} />
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

      <section className="contents" id="contents">
        <p className="section-kicker">CONTENTS EXAMPLES</p>
        <h2>いろんな形で、特別な時間を。</h2>
        <div className="content-grid">
          {contentExamples.map((item) => (
            <article key={item.title}>
              <Image src={cell(item.image)} alt="" width={166} height={156} />
              <h3>{item.title}</h3>
              <p>{item.body}</p>
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
        <a className="brand brand-footer" href="#top" aria-label="beyond chat home">
          <span className="brand-mark">
            <span />
            <span />
          </span>
          <span className="brand-copy">
            <strong>beyond chat</strong>
            <small>talk more, be more.</small>
          </span>
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
