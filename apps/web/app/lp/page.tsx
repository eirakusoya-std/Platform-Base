import Image from "next/image";
import type { ReactNode } from "react";
import { MicrophoneIcon, SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { ArrowRightCircleIcon } from "@heroicons/react/24/solid";

const cell = (name: string) => `/lp/cells/${name}.png`;
const edited = (name: string) => `/lp/edited/${name}`;

const navItems = ["Concept", "How it Works", "Contents", "FAQ"];

const ctaLinks = {
  watch: "/schedule",
  speaker: "/auth/signup",
};

const contentExamples = [
  {
    image: edited("ex_remembered.png"),
    title: "Be Remembered",
    body: "Not just another viewer — someone they recognize.",
  },
  {
    image: edited("ex_talk.png"),
    title: "Talk, Don’t Just Watch",
    body: "Go beyond watching Japanese VTubers.\nActually speak with them.",
  },
  {
    image: edited("ex_effort.png"),
    title: "Show Your Effort",
    body: "Stand out through how you connect — not how much you spend.",
  },
  {
    image: edited("ex_conversation.png"),
    title: "Real Conversations",
    body: "No textbooks, no scripts.\nJust natural, live communication.",
  },
];

const vtuberAvatars = ["cell_32", "cell_33", "cell_35"];

function CtaButton({
  children,
  href,
  variant = "primary",
}: {
  children: string;
  href: string;
  variant?: "primary" | "secondary" | "light" | "speaker";
}) {
  return (
    <a className={`lp-cta-button lp-cta-button-${variant}`} href={href}>
      <span>{children}</span>
      <span className="join-arrow" aria-hidden>
        <ArrowRightCircleIcon />
      </span>
    </a>
  );
}

function CtaGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`lp-cta-group ${className}`.trim()}>{children}</div>;
}

function SpeechBubble({
  className,
  text,
  fill,
  color,
  width,
  direction = "right",
}: {
  className: string;
  text: string;
  fill: string;
  color: string;
  width: number;
  direction?: "left" | "right";
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
        strokeWidth="0"
        strokeLinejoin="round"
        transform={direction === "left" ? `translate(${width}, 0) scale(-1, 1)` : undefined}
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

      <header className="lp-header-shell">
        <div className="lp-header">
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
          <CtaButton href={ctaLinks.watch}>Start Watching Free</CtaButton>
        </div>
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
          <h2>Go beyond just being a fan.</h2>
          <p className="lead">
            A platform where global fans and Japanese VTubers connect in real time.
            Not just a place to watch — a place where you become part of the moment.
          </p>
          <CtaGroup className="hero-actions">
            <CtaButton href={ctaLinks.watch} variant="secondary">
              Start Watching Free
            </CtaButton>
            <CtaButton href={ctaLinks.speaker} variant="speaker">
              Become a Speaker
            </CtaButton>
          </CtaGroup>
          <p className="cta-helper">Watch for free. Speak when you&apos;re ready.</p>
        </div>

        <div className="hero-art" aria-label="VTuber and fan messages">
          <div className="hero-character">
            <Image className="hero-character-mask" src={edited("LPchara.svg")} alt="" width={669} height={746} priority aria-hidden />
            <Image className="hero-character-image" src={edited("aiment_LPchara_v2.PNG")} alt="beyond chat VTuber" width={604} height={881} priority />
          </div>
          <SpeechBubble className="bubble-blue" text="I love your stream! You're the best!" fill="#eaf2ff" color="#376df4" width={260} />
          <SpeechBubble className="bubble-yellow" text="Can you say &quot;ありがとう&quot;?" fill="#ffe680" color="#062a63" width={260} />
          <SpeechBubble className="bubble-dark" text="Nice to meet you!" fill="#062a63" color="#ffffff" width={260} />
          <SpeechBubble className="bubble-pink" text="You noticed me! Thank you!😭" fill="#ffffff" color="#ff5b7d" width={270} direction="left" />
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
              A place where watching
              <br />
              turns into something more.
            </h2>
            <p>
              Talk in real time, share what you feel, and be recognized.
              <br />
              A single word from you can change the moment.
              <br />
              An unforgettable experience that brings you closer to your favorite VTuber.
            </p>
          </div>
          <div className="concept-visual">
            <Image src={edited("concept.png")} alt="Fan and VTuber connection concept" width={1457} height={1079} />
          </div>
        </div>
      </section>

      <section className="steps" id="how-it-works">
        <p className="section-kicker">HOW IT WORKS</p>
        <h2>3 steps to be more than just a viewer.</h2>
        <div className="step-grid">
          <article>
            <span className="step-number">01</span>
            <p className="step-title">Join the stream</p>
            <Image src={edited("join_stream.png")} alt="" width={140} height={100} />
            <p>Watch for free and feel the moment.</p>
          </article>
          <article>
            <span className="step-number">02</span>
            <p className="step-title">Step in</p>
            <Image src={edited("step_in.png")} alt="" width={140} height={100} />
            <p>Start interacting and make your presence known.</p>
          </article>
          <article>
            <span className="step-number">03</span>
            <p className="step-title">Be recognized</p>
            <Image src={edited("recognized.png")} alt="" width={140} height={100} />
            <p>Close enough to be seen and heard.</p>
          </article>
        </div>
        <div className="section-cta">
          <p>Ready to step in?</p>
          <CtaButton href={ctaLinks.watch}>Find a Live Session</CtaButton>
        </div>
      </section>

      <section className="role-bridge" aria-labelledby="role-bridge-title">
        <p className="section-kicker">LISTENER / SPEAKER</p>
        <h2 id="role-bridge-title">From watching to participating.</h2>
        <div className="role-bridge-grid">
          <article className="role-card role-card-listener" tabIndex={0}>
            <div className="role-card-head">
              <SpeakerWaveIcon className="role-icon" aria-hidden />
              <p className="role-label">Listener</p>
            </div>
            <div className="role-visual-slot" aria-hidden>
              <Image src={edited("listener_image.png")} alt="" width={604} height={881} />
            </div>
            <div className="role-copy">
              <h3>Just watching is where it starts.</h3>
              <p>
                Join live streams for free and experience the moment.
                <br />
                You can listen, react, and feel the connection.
              </p>
              <p className="role-note">But you&apos;re still on the audience side.</p>
              <CtaButton href={ctaLinks.watch} variant="secondary">
                Watch for Free
              </CtaButton>
            </div>
          </article>
          <article className="role-card role-card-speaker" tabIndex={0}>
            <div className="role-card-head">
              <MicrophoneIcon className="role-icon" aria-hidden />
              <p className="role-label">Speaker</p>
            </div>
            <div className="role-visual-slot" aria-hidden>
              <Image src={edited("speaker_image.png")} alt="" width={604} height={881} />
            </div>
            <div className="role-copy">
              <h3>Step beyond watching.</h3>
              <p>
                As a Speaker, you don&apos;t just watch —
                <br />
                you talk, interact, and become part of the stream.
              </p>
              <p className="role-note">
                They hear you. They respond to you.
                <br />
                You&apos;re no longer just a viewer.
              </p>
              <CtaButton href={ctaLinks.speaker} variant="speaker">
                Join as a Speaker
              </CtaButton>
            </div>
          </article>
        </div>
      </section>

      <section className="lp-contents" id="contents">
        <p className="section-kicker">CONTENTS EXAMPLES</p>
        <h2>
          More than a stream.
          <br />
          Moments that stay with you.
        </h2>
        <div className="content-grid">
          {contentExamples.map((item) => (
            <article key={item.title}>
              <div className="content-figure" aria-hidden>
                <Image src={item.image} alt="" width={166} height={156} />
              </div>
              <div className="content-text">
                <h3>{item.title}</h3>
                <p>
                  {item.body.split("\n").map((line, index, lines) => (
                    <span key={`${item.title}-${line}`}>
                      {line}
                      {index < lines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="section-cta section-cta-speaker">
          <p>Your voice can be part of the stream.</p>
          <CtaGroup>
            <CtaButton href={ctaLinks.watch}>Start Watching Free</CtaButton>
            <CtaButton href={ctaLinks.speaker} variant="speaker">
              Join as a Speaker
            </CtaButton>
          </CtaGroup>
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
