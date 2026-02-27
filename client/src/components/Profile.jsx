import Logo from "@/Logo";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import React from "react";
import { Link } from "react-router";

const Profile = () => {
  return (
    <div className="flex flex-col justify-center items-center">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>

      <section className="relative isolate w-full overflow-hidden rounded-2xl border border-border bg-card px-6 py-10 shadow-sm sm:w-2/3 sm:px-10 sm:py-14">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.25),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.18),transparent_45%)]"
        />

        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
              <span className="grid size-10 place-items-center rounded-full bg-card">
                <Logo />
              </span>
              Welcome to FocusTube
            </div>

            <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-5xl">
              Build your team workspace with a clean and focused interface.
            </h1>

            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              FocusTube helps you organize people, sessions, and collaboration flow
              without clutter. Start with your account and move faster.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Create Account
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/60"
              >
                Login
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                Quick onboarding
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                Responsive layout
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                Ready for scaling
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
