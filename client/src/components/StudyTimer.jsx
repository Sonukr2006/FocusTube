import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const QUICK_DURATIONS = [30, 45, 60];
const TIMER_STORAGE_KEY = "studyTimer";

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// localStorage se timer state load kare
function loadTimerState() {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load timer state:", error);
  }
  return { timeLeftSec: 0, isRunning: false, isCompleted: false };
}

// localStorage me timer state save kare
function saveTimerState(state) {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save timer state:", error);
  }
}

const StudyTimer = ({ interactive = true, compact = false }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Page load ke time localStorage se state restore kare
  useEffect(() => {
    const savedState = loadTimerState();
    setTimeLeftSec(savedState.timeLeftSec);
    setIsRunning(savedState.isRunning);
    setIsCompleted(savedState.isCompleted);
    setIsLoaded(true);
  }, []);

  // Jab bhi timer state change ho to localStorage update kare
  useEffect(() => {
    if (!isLoaded) return;
    
    saveTimerState({
      timeLeftSec,
      isRunning,
      isCompleted,
    });
  }, [timeLeftSec, isRunning, isCompleted, isLoaded]);

  const startCountdown = (minutes) => {
    const parsedMinutes = Number(minutes);
    const safeMinutes = Math.min(Math.max(Math.floor(parsedMinutes), 1), 300);
    const totalSeconds = safeMinutes * 60;

    setIsCompleted(false);
    setTimeLeftSec(totalSeconds);
    setIsRunning(true);
    setIsPickerOpen(false);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleResume = () => {
    if (timeLeftSec <= 0) return;
    setIsCompleted(false);
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeftSec(0);
    setIsCompleted(false);
  };

  useEffect(() => {
    if (!isRunning) return undefined;

    const intervalId = window.setInterval(() => {
      setTimeLeftSec((previous) => {
        if (previous <= 1) {
          window.clearInterval(intervalId);
          setIsRunning(false);
          setIsCompleted(true);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning]);

  const hasTimerValue = timeLeftSec > 0;
  
  // Jab tak localStorage se data load na ho jaaye tab loading state dikhaye
  if (!isLoaded) {
    return <div>Loading timer...</div>;
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className={compact ? "space-y-1 pb-2" : "space-y-1"}>
          <CardTitle className={compact ? "text-base" : undefined}>Study Timer</CardTitle>
          <CardDescription>
            {interactive
              ? "Start focus session and countdown to 00:00."
              : "Timer is visible here. Start/stop controls are only on Home page."}
          </CardDescription>
        </CardHeader>
        <CardContent
          className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${
            compact ? "pt-0" : ""
          }`}
        >
          <div>
            <p className={compact ? "text-2xl font-semibold tracking-tight" : "text-4xl font-semibold tracking-tight"}>
              {formatTime(timeLeftSec)}
            </p>
            <p className="text-sm text-muted-foreground">
              {isRunning ? "Focus session running..." : "Timer is paused or not started."}
            </p>
          </div>

          {interactive ? (
            <div className="flex flex-wrap gap-2">
              {!hasTimerValue ? (
                <Button type="button" onClick={() => setIsPickerOpen(true)}>
                  Start
                </Button>
              ) : null}

              {hasTimerValue && isRunning ? (
                <Button type="button" variant="outline" onClick={handlePause}>
                  Pause
                </Button>
              ) : null}

              {hasTimerValue && !isRunning && timeLeftSec > 0 ? (
                <Button type="button" variant="outline" onClick={handleResume}>
                  Resume
                </Button>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsPickerOpen(true)}
                disabled={isRunning}
              >
                Set Duration
              </Button>

              <Button type="button" variant="ghost" onClick={handleReset} disabled={!hasTimerValue}>
                Reset
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {interactive && isPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Select Study Duration</CardTitle>
              <CardDescription>Choose one option and timer will start immediately.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {QUICK_DURATIONS.map((minutes) => (
                  <Button key={minutes} type="button" variant="outline" onClick={() => startCountdown(minutes)}>
                    {minutes} min
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-study-minutes">Custom minutes</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-study-minutes"
                    type="number"
                    min="1"
                    max="300"
                    placeholder="Enter minutes"
                    value={customMinutes}
                    onChange={(event) => setCustomMinutes(event.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!customMinutes.trim()) return;
                      startCountdown(customMinutes);
                      setCustomMinutes("");
                    }}
                  >
                    Start
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={() => setIsPickerOpen(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isCompleted ? <p className="mt-2 text-sm font-medium text-foreground">Time is up (00:00).</p> : null}
    </>
  );
};

export default StudyTimer;