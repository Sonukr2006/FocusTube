import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  MessageSquareText,
  PlayCircle,
  Timer,
  Waves,
} from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/Logo";

const highlights = [
  {
    title: "YouTube Study Sessions",
    description: "Paste playlist or video link, start focused playback, and resume exactly where you stopped.",
    icon: PlayCircle,
  },
  {
    title: "Focus Timer + Todos",
    description: "Run structured study blocks and manage your task list without leaving the workflow.",
    icon: Timer,
  },
  {
    title: "SoftMurmure Sound Mixer",
    description: "Reduce outside noise with custom rain, wind, brown noise and local ambient sound mixes.",
    icon: Waves,
  },
  {
    title: "Transcript Q&A Bot",
    description: "Ask questions from YouTube videos using transcript-aware Gemini/OpenAI responses.",
    icon: MessageSquareText,
  },
];

const Heros = () => {
  return (
    <section className="relative isolate w-full overflow-hidden rounded-2xl border border-border bg-card px-6 py-10 shadow-sm sm:w-2/3 sm:px-10 sm:py-14">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.25),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.18),transparent_45%)]"
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
            <span className="grid size-10 place-items-center rounded-full bg-card">
              <Logo />
            </span>
            FocusTube Learning System
          </div>

          <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-5xl">
            Building a Distraction-Free Deep Learning Environment.
          </h1>

          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            FocusTube is built for students and self-learners who want less
            distraction and more output. Plan study blocks, track progress,
            control ambient sound, and ask smart questions from video transcripts
            in one app.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Start Free
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/60"
            >
              Continue Login
            </Link>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              Resume sessions automatically
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              Daily study analytics
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              Transcript-based Q&A
            </span>
          </div>
        </div>

        <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2 lg:max-w-2xl">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-xl border border-border bg-background/70 p-4 backdrop-blur-sm"
              >
                <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card">
                  <Icon className="size-4 text-primary" />
                </div>
                <h2 className="mb-1 text-sm font-semibold text-foreground">
                  {item.title}
                </h2>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl items-center gap-2 rounded-lg border border-border/80 bg-background/65 px-4 py-2 text-xs text-muted-foreground">
        <BarChart3 className="size-4 text-primary" />
        Purpose: reduce distraction, improve retention, and make every study session measurable.
      </div>
    </section>
  );
};

export default Heros;
