import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Button } from '../components/Button';
import { Marquee } from '../components/Marquee';
import { PageTransition } from '../components/PageTransition';
import { Reveal } from '../components/Reveal';
import { Snowflake } from '../components/Snowflake';
import { useAuth } from '../hooks/auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const TITLE_WORDS = ['Winter', 'Confessions'] as const;

const letterContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.15 } },
};

const letter: Variants = {
  hidden: { opacity: 0, y: 40, rotate: 6 },
  show: { opacity: 1, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 18 } },
};

const SAMPLE_CONFESSIONS = [
  'I still sleep with the heater on in July.',
  'You make the whole group chat warmer.',
  'I pretend to like skiing so I can have the cabin cocoa.',
  'Describe me in three words? Kind, loud, cozy.',
] as const;

const MARQUEE_ITEMS = [
  'send me your confessions',
  'ask me anything',
  'never have I ever...',
  'describe me in three words',
  'what is your cozy secret?',
  'tell me who you are crushing on',
  'share an opinion that is a little too hot',
];

const STEPS = [
  {
    title: 'Claim your link',
    body: 'Pick a username, add an email, and get your own page in seconds.',
  },
  {
    title: 'Share it anywhere',
    body: 'Drop your link in a bio, a story, or the group chat. Friends write without a name attached.',
  },
  {
    title: 'Read what drifts in',
    body: 'Confessions land in your private inbox. Reply to the ones you love, delete the rest.',
  },
] as const;

const GAMES = [
  { name: 'Ask me anything', sample: 'What is your coziest winter memory?', icon: '☕' },
  { name: 'Never have I ever', sample: 'Never have I ever faked being sick to stay in.', icon: '🧤' },
  { name: 'Confessions', sample: 'I secretly love when it gets dark at 5 pm.', icon: '🕯️' },
  { name: 'Three words', sample: 'You are warm, funny, unforgettable.', icon: '✨' },
] as const;

function HeroTitle() {
  return (
    <motion.h1
      className="hero-title"
      aria-label="Winter Confessions"
      variants={letterContainer}
      initial="hidden"
      animate="show"
    >
      {TITLE_WORDS.map((word, index) => (
        <span key={word} className={`hero-word ${index === 1 ? 'hero-word-accent' : ''}`} aria-hidden="true">
          {Array.from(word).map((char, charIndex) => (
            <motion.span key={`${word}-${charIndex}`} className="hero-letter" variants={letter}>
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.h1>
  );
}

function PhoneMock() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SAMPLE_CONFESSIONS.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mock-wrap" aria-hidden="true">
      <motion.div
        className="bubble bubble-a"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        new confession ❄️
      </motion.div>
      <motion.div
        className="bubble bubble-b"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        replied 💙
      </motion.div>

      <motion.div
        className="mock-card"
        initial={{ opacity: 0, y: 50, rotate: 4 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ rotate: 0, scale: 1.02 }}
      >
        <div className="mock-head">
          <span className="mock-avatar">M</span>
          <div>
            <strong>@mika</strong>
            <span>send me anonymous confessions</span>
          </div>
        </div>
        <div className="mock-body">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              {SAMPLE_CONFESSIONS[index]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mock-foot">
          <span>🔒 100% anonymous</span>
          <span className="mock-send">Send</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  useDocumentTitle();
  const { user } = useAuth();

  return (
    <PageTransition className="landing">
      <section className="hero">
        <div className="hero-copy">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Snowflake size={16} /> Anonymous &amp; cozy
          </motion.p>
          <HeroTitle />
          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            Get honest confessions from your friends. Warm secrets for cold nights, with no names attached.
          </motion.p>
          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.6 }}
          >
            {user ? (
              <Button to="/inbox">Open your inbox</Button>
            ) : (
              <Button to="/auth?mode=signup">Claim your link</Button>
            )}
            <a className="btn btn-ghost" href="#how-it-works">
              See how it works
            </a>
          </motion.div>
        </div>
        <PhoneMock />
      </section>

      <Marquee items={MARQUEE_ITEMS} />

      <section className="section" id="how-it-works" aria-labelledby="how-title">
        <Reveal>
          <h2 id="how-title" className="section-title">
            Three steps to your first confession
          </h2>
        </Reveal>
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Reveal delay={index * 0.12} className="step-card">
                <span className="step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" aria-labelledby="play-title">
        <Reveal>
          <h2 id="play-title" className="section-title">
            Four ways to play
          </h2>
          <p className="section-sub">Pick a style, or mix them. Your friends choose what to send.</p>
        </Reveal>
        <ul className="games">
          {GAMES.map((game, index) => (
            <li key={game.name}>
              <Reveal delay={index * 0.1}>
                <motion.article
                  className="game-card"
                  whileHover={{ y: -8, rotate: index % 2 === 0 ? -1.5 : 1.5 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                >
                  <span className="game-icon" aria-hidden="true">
                    {game.icon}
                  </span>
                  <h3>{game.name}</h3>
                  <p>{game.sample}</p>
                </motion.article>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="section promise" aria-labelledby="promise-title">
        <Reveal className="promise-card">
          <h2 id="promise-title" className="section-title section-title-left">
            You stay in control of your inbox
          </h2>
          <ul className="promise-list">
            <li>Senders are never shown to you, and you never see a name.</li>
            <li>Delete any confession with one tap.</li>
            <li>Choose which replies become public, and keep the rest private.</li>
          </ul>
        </Reveal>
      </section>

      <section className="cta-band" aria-labelledby="cta-title">
        <Reveal>
          <h2 id="cta-title">Ready for the snowfall?</h2>
          <p>Your link takes less than a minute to set up.</p>
          <Button to={user ? '/inbox' : '/auth?mode=signup'} variant="light">
            {user ? 'Go to your inbox' : 'Claim your link'}
          </Button>
        </Reveal>
      </section>
    </PageTransition>
  );
}
