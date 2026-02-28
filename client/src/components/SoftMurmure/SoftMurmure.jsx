import { useEffect, useMemo, useRef, useState } from "react";
import {
  CloudLightning,
  CloudRain,
  Leaf,
  Pause,
  Play,
  Radio,
  RotateCcw,
  SlidersHorizontal,
  Volume2,
  Waves,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const TRACK_DEFINITIONS = [
  {
    id: "Brain Activation frequency",
    label: "Local Upload",
    description: "Plays your file: activateBrainFreq.mpeg.mp3",
    icon: Radio,
    defaultVolume: 45,
    defaultPan: 0,
    audioUrl: "/sounds/activateBrainFreq.mpeg.mp3",
  },
  {
    id: "Brain Activation frequency - 2",
    label: "Local Upload",
    description: "Plays your file: activateBrainFreq.mpeg.mp3",
    icon: Radio,
    defaultVolume: 45,
    defaultPan: 0,
    audioUrl: "/sounds/BrainFreq2.mpeg.mp3",
  },

  {
    id: "rain",
    label: "Rain",
    description: "Consistent rainfall for focus sessions.",
    icon: CloudRain,
    defaultVolume: 58,
    defaultPan: 0,
    audioUrl: "/sounds/rain.mp3",
  },
  {
    id: "bird",
    label: "Birds",
    description: "Light ambient birds chirps.",
    icon: Leaf,
    defaultVolume: 10,
    defaultPan: 0,
    audioUrl: "/sounds/birds.mp3",
  },
  {
    id: "thunder",
    label: "Thunder",
    description: "Random distant thunder rumbles.",
    icon: CloudLightning,
    defaultVolume: 14,
    defaultPan: 0,
    audioUrl: "/sounds/thunder.mp3",
  },
  {
    id: "wind",
    label: "Wind",
    description: "Wide soft wind movement.",
    icon: Wind,
    defaultVolume: 34,
    defaultPan: 0,
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Slow wave-like swells.",
    icon: Waves,
    defaultVolume: 26,
    defaultPan: 0,
  },
  {
    id: "stream",
    label: "Stream",
    description: "Bright flowing water texture.",
    icon: Waves,
    defaultVolume: 18,
    defaultPan: 0,
  },
  {
    id: "forest",
    label: "Forest Birds",
    description: "Light ambient birds chirps.",
    icon: Leaf,
    defaultVolume: 10,
    defaultPan: 0,
  } 
  
];

const PRESETS = {
  Work: {
    rain: 62,
    thunder: 12,
    wind: 34,
    ocean: 20,
    stream: 18,
    forest: 8,
    "white-noise": 22,
    "brown-noise": 24,
  },
  Relax: {
    rain: 44,
    thunder: 10,
    wind: 26,
    ocean: 42,
    stream: 30,
    forest: 24,
    "white-noise": 14,
    "brown-noise": 16,
  },
  Sleep: {
    rain: 54,
    thunder: 6,
    wind: 24,
    ocean: 18,
    stream: 10,
    forest: 6,
    "white-noise": 12,
    "brown-noise": 52,
  },
};

const CUSTOM_PRESETS_STORAGE_KEY = "focustube.soft-murmure.custom-presets.v1";
const MAX_CUSTOM_PRESETS = 18;

const clampNumber = (value, min, max) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return min;
  return Math.min(Math.max(numeric, min), max);
};

const makePresetId = () =>
  `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const makeInitialTrackState = () =>
  TRACK_DEFINITIONS.map((track) => ({
    ...track,
    volume: track.defaultVolume,
    pan: track.defaultPan,
    muted: false,
    solo: false,
  }));

const noiseBufferCache = {};

function createNoiseBuffer(context, color, duration = 2) {
  const key = `${color}-${duration}-${context.sampleRate}`;
  if (noiseBufferCache[key]) return noiseBufferCache[key];

  const bufferSize = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  let brownLast = 0;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < bufferSize; i += 1) {
    const white = Math.random() * 2 - 1;
    if (color === "white") {
      data[i] = white;
      continue;
    }

    if (color === "brown") {
      brownLast = (brownLast + 0.02 * white) / 1.02;
      data[i] = brownLast * 3.5;
      continue;
    }

    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    data[i] = pink * 0.12;
  }

  noiseBufferCache[key] = buffer;
  return buffer;
}

function createLoopingNoiseSource(context, color) {
  const source = context.createBufferSource();
  source.buffer = createNoiseBuffer(context, color, 2.5);
  source.loop = true;
  source.start();
  return source;
}

function createTrackEngine(context, trackId, masterGain) {
  const track = TRACK_DEFINITIONS.find((item) => item.id === trackId);
  const trackGain = context.createGain();
  const panner = context.createStereoPanner();
  trackGain.gain.value = 0;
  panner.pan.value = 0;
  trackGain.connect(panner);
  panner.connect(masterGain);

  const ownedNodes = [];
  const activeTimers = [];
  let disposed = false;

  const registerNode = (node) => {
    ownedNodes.push(node);
    return node;
  };

  const registerTimer = (timer) => {
    activeTimers.push(timer);
    return timer;
  };

  const wireNode = (source, ...nodes) => {
    let previous = source;
    nodes.forEach((node) => {
      previous.connect(node);
      previous = node;
    });
    previous.connect(trackGain);
  };

  if (track?.audioUrl) {
    const mediaElement = new Audio(track.audioUrl);
    mediaElement.loop = true;
    mediaElement.preload = "auto";
    mediaElement.crossOrigin = "anonymous";

    const mediaSource = context.createMediaElementSource(mediaElement);
    mediaSource.connect(trackGain);

    const setVolume = (volume) => {
      trackGain.gain.setTargetAtTime(volume, context.currentTime, 0.08);
    };

    const setPan = (panValue) => {
      panner.pan.setTargetAtTime(panValue, context.currentTime, 0.08);
    };

    const start = async () => {
      try {
        await mediaElement.play();
      } catch {
        // no-op
      }
    };

    const dispose = () => {
      try {
        mediaElement.pause();
        mediaElement.removeAttribute("src");
        mediaElement.load();
      } catch {
        // no-op
      }
      try {
        mediaSource.disconnect();
      } catch {
        // no-op
      }
      try {
        trackGain.disconnect();
        panner.disconnect();
      } catch {
        // no-op
      }
    };

    return {
      setVolume,
      setPan,
      start,
      dispose,
    };
  }

  if (trackId === "rain") {
    const source = registerNode(createLoopingNoiseSource(context, "white"));
    const highPass = registerNode(context.createBiquadFilter());
    highPass.type = "highpass";
    highPass.frequency.value = 620;
    const lowPass = registerNode(context.createBiquadFilter());
    lowPass.type = "lowpass";
    lowPass.frequency.value = 8200;
    wireNode(source, highPass, lowPass);
  } else if (trackId === "wind") {
    const source = registerNode(createLoopingNoiseSource(context, "pink"));
    const bandPass = registerNode(context.createBiquadFilter());
    bandPass.type = "bandpass";
    bandPass.frequency.value = 280;
    bandPass.Q.value = 0.35;
    const lowPass = registerNode(context.createBiquadFilter());
    lowPass.type = "lowpass";
    lowPass.frequency.value = 2400;
    wireNode(source, bandPass, lowPass);

    const lfo = registerNode(context.createOscillator());
    const lfoGain = registerNode(context.createGain());
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 130;
    lfo.connect(lfoGain);
    lfoGain.connect(bandPass.frequency);
    lfo.start();
  } else if (trackId === "ocean") {
    const baseSource = registerNode(createLoopingNoiseSource(context, "brown"));
    const surfSource = registerNode(createLoopingNoiseSource(context, "white"));

    const baseLowPass = registerNode(context.createBiquadFilter());
    baseLowPass.type = "lowpass";
    baseLowPass.frequency.value = 1400;
    const waveGain = registerNode(context.createGain());
    waveGain.gain.value = 0.5;
    wireNode(baseSource, baseLowPass, waveGain);

    const surfBandPass = registerNode(context.createBiquadFilter());
    surfBandPass.type = "bandpass";
    surfBandPass.frequency.value = 1700;
    surfBandPass.Q.value = 0.45;
    const surfGain = registerNode(context.createGain());
    surfGain.gain.value = 0.2;
    wireNode(surfSource, surfBandPass, surfGain);

    const lfo = registerNode(context.createOscillator());
    const lfoGain = registerNode(context.createGain());
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.24;
    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);
    lfo.start();
  } else if (trackId === "stream") {
    const source = registerNode(createLoopingNoiseSource(context, "white"));
    const highPass = registerNode(context.createBiquadFilter());
    highPass.type = "highpass";
    highPass.frequency.value = 300;
    const bandPass = registerNode(context.createBiquadFilter());
    bandPass.type = "bandpass";
    bandPass.frequency.value = 1150;
    bandPass.Q.value = 0.9;
    wireNode(source, highPass, bandPass);

    const lfo = registerNode(context.createOscillator());
    const lfoGain = registerNode(context.createGain());
    lfo.frequency.value = 0.22;
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(bandPass.frequency);
    lfo.start();
  } else if (trackId === "forest") {
    const base = registerNode(createLoopingNoiseSource(context, "pink"));
    const highPass = registerNode(context.createBiquadFilter());
    highPass.type = "highpass";
    highPass.frequency.value = 1350;
    const lowPass = registerNode(context.createBiquadFilter());
    lowPass.type = "lowpass";
    lowPass.frequency.value = 4200;
    const ambienceGain = registerNode(context.createGain());
    ambienceGain.gain.value = 0.17;
    wireNode(base, highPass, lowPass, ambienceGain);

    const scheduleBirdChirp = () => {
      if (disposed) return;
      const now = context.currentTime + 0.03;
      const chirpGain = context.createGain();
      const chirpPan = context.createStereoPanner();
      const chirpOsc = context.createOscillator();
      chirpOsc.type = "sine";
      chirpOsc.frequency.setValueAtTime(1300 + Math.random() * 800, now);
      chirpOsc.frequency.exponentialRampToValueAtTime(
        2200 + Math.random() * 1200,
        now + 0.08,
      );

      chirpGain.gain.setValueAtTime(0.0001, now);
      chirpGain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      chirpPan.pan.value = Math.random() * 1.4 - 0.7;

      chirpOsc.connect(chirpGain);
      chirpGain.connect(chirpPan);
      chirpPan.connect(trackGain);
      chirpOsc.start(now);
      chirpOsc.stop(now + 0.16);

      registerTimer(setTimeout(scheduleBirdChirp, 1400 + Math.random() * 2600));
    };
    scheduleBirdChirp();
  } else if (trackId === "white-noise") {
    const source = registerNode(createLoopingNoiseSource(context, "white"));
    wireNode(source);
  } else if (trackId === "brown-noise") {
    const source = registerNode(createLoopingNoiseSource(context, "brown"));
    const lowPass = registerNode(context.createBiquadFilter());
    lowPass.type = "lowpass";
    lowPass.frequency.value = 3600;
    wireNode(source, lowPass);
  } else if (trackId === "thunder") {
    const base = registerNode(createLoopingNoiseSource(context, "brown"));
    const lowPass = registerNode(context.createBiquadFilter());
    lowPass.type = "lowpass";
    lowPass.frequency.value = 120;
    const rumbleGain = registerNode(context.createGain());
    rumbleGain.gain.value = 0.08;
    wireNode(base, lowPass, rumbleGain);

    const scheduleThunder = () => {
      if (disposed) return;
      const now = context.currentTime + 0.04;
      const burst = context.createBufferSource();
      burst.buffer = createNoiseBuffer(context, "brown", 2.8);
      const burstFilter = context.createBiquadFilter();
      burstFilter.type = "lowpass";
      burstFilter.frequency.value = 150 + Math.random() * 160;
      const burstGain = context.createGain();
      burstGain.gain.setValueAtTime(0.0001, now);
      burstGain.gain.linearRampToValueAtTime(1, now + 0.07);
      burstGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      burst.connect(burstFilter);
      burstFilter.connect(burstGain);
      burstGain.connect(trackGain);
      burst.start(now);
      burst.stop(now + 2.25);

      registerTimer(setTimeout(scheduleThunder, 6000 + Math.random() * 9000));
    };
    scheduleThunder();
  }

  const setVolume = (volume) => {
    trackGain.gain.setTargetAtTime(volume, context.currentTime, 0.08);
  };

  const setPan = (panValue) => {
    panner.pan.setTargetAtTime(panValue, context.currentTime, 0.08);
  };

  const dispose = () => {
    disposed = true;
    activeTimers.forEach((timer) => clearTimeout(timer));
    ownedNodes.forEach((node) => {
      try {
        if (typeof node.stop === "function") node.stop();
      } catch {
        // no-op
      }
      try {
        node.disconnect();
      } catch {
        // no-op
      }
    });
    try {
      trackGain.disconnect();
      panner.disconnect();
    } catch {
      // no-op
    }
  };

  return {
    setVolume,
    setPan,
    start: async () => {},
    dispose,
  };
}

function getEffectiveVolumes(tracks) {
  const hasSolo = tracks.some((track) => track.solo);
  return tracks.reduce((accumulator, track) => {
    const shouldSilence = track.muted || (hasSolo && !track.solo);
    accumulator[track.id] = shouldSilence ? 0 : track.volume / 100;
    return accumulator;
  }, {});
}

function normalizePreset(rawPreset) {
  if (!rawPreset || typeof rawPreset !== "object") return null;

  const name =
    typeof rawPreset.name === "string"
      ? rawPreset.name.trim().slice(0, 40)
      : "";
  if (!name) return null;

  const id =
    typeof rawPreset.id === "string" && rawPreset.id.trim()
      ? rawPreset.id
      : makePresetId();
  const masterVolume = clampNumber(rawPreset.masterVolume, 0, 100);

  const trackSettings =
    rawPreset.trackSettings && typeof rawPreset.trackSettings === "object"
      ? rawPreset.trackSettings
      : {};

  const normalizedTrackSettings = TRACK_DEFINITIONS.reduce(
    (accumulator, track) => {
      const source = trackSettings[track.id] ?? {};
      accumulator[track.id] = {
        volume: clampNumber(source.volume ?? track.defaultVolume, 0, 100),
        pan: clampNumber(source.pan ?? 0, -100, 100),
        muted: Boolean(source.muted),
        solo: Boolean(source.solo),
      };
      return accumulator;
    },
    {},
  );

  return {
    id,
    name,
    masterVolume,
    trackSettings: normalizedTrackSettings,
    updatedAt:
      typeof rawPreset.updatedAt === "string"
        ? rawPreset.updatedAt
        : new Date().toISOString(),
  };
}

const SoftMurmure = () => {
  const [tracks, setTracks] = useState(makeInitialTrackState);
  const [masterVolume, setMasterVolume] = useState(74);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState("Custom");
  const [customPresetName, setCustomPresetName] = useState("");
  const [customPresets, setCustomPresets] = useState([]);
  const [activeCustomPresetId, setActiveCustomPresetId] = useState(null);

  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const trackEnginesRef = useRef({});

  const effectiveVolumes = useMemo(() => getEffectiveVolumes(tracks), [tracks]);

  const initAudioContext = async () => {
    if (audioContextRef.current) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const context = new AudioCtx();
    const masterGain = context.createGain();
    masterGain.gain.value = masterVolume / 100;
    masterGain.connect(context.destination);

    const engines = {};
    TRACK_DEFINITIONS.forEach((track) => {
      engines[track.id] = createTrackEngine(context, track.id, masterGain);
    });

    audioContextRef.current = context;
    masterGainRef.current = masterGain;
    trackEnginesRef.current = engines;
  };

  const syncAudioParams = () => {
    const context = audioContextRef.current;
    const engines = trackEnginesRef.current;
    const masterGain = masterGainRef.current;
    if (!context || !masterGain || !engines) return;

    masterGain.gain.setTargetAtTime(
      masterVolume / 100,
      context.currentTime,
      0.08,
    );
    tracks.forEach((track) => {
      const engine = engines[track.id];
      if (!engine) return;
      engine.setVolume(effectiveVolumes[track.id] ?? 0);
      engine.setPan(track.pan / 100);
    });
  };

  const stopAndDisposeAudio = async () => {
    const context = audioContextRef.current;
    const engines = trackEnginesRef.current;

    Object.values(engines).forEach((engine) => engine?.dispose?.());
    trackEnginesRef.current = {};

    if (context) {
      await context.close();
    }

    audioContextRef.current = null;
    masterGainRef.current = null;
  };

  const togglePlay = async () => {
    if (isPlaying) {
      await stopAndDisposeAudio();
      setIsPlaying(false);
      return;
    }

    await initAudioContext();
    syncAudioParams();
    const context = audioContextRef.current;
    if (!context) return;
    await context.resume();
    await Promise.all(
      Object.values(trackEnginesRef.current).map((engine) => engine?.start?.()),
    );
    setIsPlaying(true);
  };

  const applyPreset = (presetName) => {
    const preset = PRESETS[presetName];
    if (!preset) return;

    setTracks((currentTracks) =>
      currentTracks.map((track) => ({
        ...track,
        volume: preset[track.id] ?? track.defaultVolume,
        pan: 0,
        muted: false,
        solo: false,
      })),
    );
    setActivePreset(presetName);
    setActiveCustomPresetId(null);
  };

  const resetMixer = () => {
    setTracks(makeInitialTrackState());
    setMasterVolume(74);
    setActivePreset("Custom");
    setActiveCustomPresetId(null);
  };

  const updateTrack = (trackId, updater) => {
    setTracks((currentTracks) =>
      currentTracks.map((track) =>
        track.id === trackId ? { ...track, ...updater(track) } : track,
      ),
    );
    setActivePreset("Custom");
    setActiveCustomPresetId(null);
  };

  const getCurrentTrackSettings = () =>
    tracks.reduce((accumulator, track) => {
      accumulator[track.id] = {
        volume: track.volume,
        pan: track.pan,
        muted: track.muted,
        solo: track.solo,
      };
      return accumulator;
    }, {});

  const saveCustomPreset = () => {
    const trimmedName = customPresetName.trim().slice(0, 40);
    if (!trimmedName) return;

    const snapshot = {
      name: trimmedName,
      masterVolume,
      trackSettings: getCurrentTrackSettings(),
      updatedAt: new Date().toISOString(),
    };

    let savedPresetId = makePresetId();
    setCustomPresets((currentPresets) => {
      const existingPresetIndex = currentPresets.findIndex(
        (preset) => preset.name.toLowerCase() === trimmedName.toLowerCase(),
      );

      if (existingPresetIndex >= 0) {
        savedPresetId = currentPresets[existingPresetIndex].id;
        return currentPresets.map((preset, index) =>
          index === existingPresetIndex
            ? { ...snapshot, id: savedPresetId }
            : preset,
        );
      }

      return [{ ...snapshot, id: savedPresetId }, ...currentPresets].slice(
        0,
        MAX_CUSTOM_PRESETS,
      );
    });

    setActivePreset("Custom");
    setActiveCustomPresetId(savedPresetId);
    setCustomPresetName(trimmedName);
  };

  const loadCustomPreset = (preset) => {
    setTracks((currentTracks) =>
      currentTracks.map((track) => {
        const source = preset.trackSettings?.[track.id] ?? {};
        return {
          ...track,
          volume: clampNumber(source.volume ?? track.defaultVolume, 0, 100),
          pan: clampNumber(source.pan ?? 0, -100, 100),
          muted: Boolean(source.muted),
          solo: Boolean(source.solo),
        };
      }),
    );
    setMasterVolume(clampNumber(preset.masterVolume, 0, 100));
    setActivePreset("Custom");
    setActiveCustomPresetId(preset.id);
    setCustomPresetName(preset.name);
  };

  const deleteCustomPreset = (presetId) => {
    setCustomPresets((currentPresets) =>
      currentPresets.filter((preset) => preset.id !== presetId),
    );
    if (activeCustomPresetId === presetId) {
      setActiveCustomPresetId(null);
    }
  };

  useEffect(() => {
    syncAudioParams();
  }, [masterVolume]);

  useEffect(() => {
    syncAudioParams();
  }, [effectiveVolumes, tracks]);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
      if (!rawValue) return;
      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) return;
      const validPresets = parsed
        .map((preset) => normalizePreset(preset))
        .filter(Boolean)
        .slice(0, MAX_CUSTOM_PRESETS);
      setCustomPresets(validPresets);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CUSTOM_PRESETS_STORAGE_KEY,
        JSON.stringify(customPresets),
      );
    } catch {
      // no-op
    }
  }, [customPresets]);

  useEffect(() => {
    return () => {
      stopAndDisposeAudio().catch(() => {});
    };
  }, []);

  return (
    <div className="space-y-5 pb-6">
      <Card className="border-border/80">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 px-2.5 py-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Soft Murmure Mixer
            </Badge>
            <Badge variant="secondary">Stress Relief + Noise Masking</Badge>
          </div>
          <CardTitle className="text-2xl md:text-3xl">
            Nature Sound Studio
          </CardTitle>
          <CardDescription>
            Rain, thunder, wind, stream aur noise channels ko mix karke apna
            calming profile banao.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button onClick={togglePlay} className="min-w-28">
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Play
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetMixer} className="min-w-28">
              <RotateCcw className="h-4 w-4" />
              Reset Mix
            </Button>
            {Object.keys(PRESETS).map((presetName) => (
              <Button
                key={presetName}
                variant={activePreset === presetName ? "default" : "outline"}
                onClick={() => applyPreset(presetName)}
              >
                {presetName}
              </Button>
            ))}
          </div>

          <div className="rounded-lg border border-border/70 bg-background/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Volume2 className="h-4 w-4" />
                Master Volume
              </div>
              <span className="text-sm text-muted-foreground">
                {masterVolume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={masterVolume}
              onChange={(event) => setMasterVolume(Number(event.target.value))}
              className="w-full accent-primary"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Tip: Bahar ka noise zyada ho to `Brown/White Noise` 25-45% par
              rakho aur nature channels 40-65% ke range me.
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Custom Presets</p>
              <Badge variant="outline">{customPresets.length} saved</Badge>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={customPresetName}
                maxLength={40}
                onChange={(event) => setCustomPresetName(event.target.value)}
                placeholder="Preset name, e.g. Deep Focus Rain"
              />
              <Button
                onClick={saveCustomPreset}
                disabled={!customPresetName.trim()}
                className="sm:w-auto"
              >
                Save Current
              </Button>
            </div>

            {customPresets.length ? (
              <div className="flex flex-wrap gap-2">
                {customPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center overflow-hidden rounded-md border border-border"
                  >
                    <Button
                      size="sm"
                      variant={
                        activeCustomPresetId === preset.id
                          ? "default"
                          : "outline"
                      }
                      onClick={() => loadCustomPreset(preset)}
                      className="rounded-none border-0"
                    >
                      {preset.name}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCustomPreset(preset.id)}
                      className="h-8 rounded-none border-l border-border px-2 text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Abhi koi custom preset saved nahi hai.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tracks.map((track) => {
          const Icon = track.icon;
          const isMutedBySolo = tracks.some((item) => item.solo) && !track.solo;
          return (
            <Card key={track.id} className="border-border/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md border border-border/70 bg-background/60 p-2">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{track.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {track.description}
                      </CardDescription>
                    </div>
                  </div>
                  {isMutedBySolo ? (
                    <Badge variant="outline">Solo muted</Badge>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Volume</span>
                    <span className="text-muted-foreground">
                      {track.volume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={track.volume}
                    onChange={(event) =>
                      updateTrack(track.id, () => ({
                        volume: Number(event.target.value),
                      }))
                    }
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Pan</span>
                    <span className="text-muted-foreground">
                      {track.pan === 0
                        ? "Center"
                        : track.pan > 0
                          ? `R +${track.pan}`
                          : `L ${track.pan}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={track.pan}
                    onChange={(event) =>
                      updateTrack(track.id, () => ({
                        pan: Number(event.target.value),
                      }))
                    }
                    className="w-full accent-primary"
                  />
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Button
                    variant={track.muted ? "destructive" : "outline"}
                    className="flex-1"
                    onClick={() =>
                      updateTrack(track.id, (currentTrack) => ({
                        muted: !currentTrack.muted,
                      }))
                    }
                  >
                    {track.muted ? "Muted" : "Mute"}
                  </Button>
                  <Button
                    variant={track.solo ? "default" : "outline"}
                    className="flex-1"
                    onClick={() =>
                      updateTrack(track.id, (currentTrack) => ({
                        solo: !currentTrack.solo,
                      }))
                    }
                  >
                    {track.solo ? "Solo On" : "Solo"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SoftMurmure;
