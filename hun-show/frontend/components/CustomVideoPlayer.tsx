"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  src: string | File;
  poster?: string;
  title?: string;
};

type SettingsView = "main" | "quality" | "speed" | "subtitles";

const ACCENT = "var(--p, #5F259F)";
const qualityOptions = ["Auto", "1080p", "720p", "480p"];
const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
const subtitleOptions = ["Off", "English"];

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 5.5v13l10-6.5-10-6.5Z" />
    </svg>
  );
}

function PauseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

function Volume2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function VolumeXIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5" />
      <path d="M16 9l5 5" />
      <path d="M21 9l-5 5" />
    </svg>
  );
}

function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.16.33.25.69.26 1.06V10a2 2 0 0 1 0 4h-.09c-.37.01-.73.1-1.06.26Z" />
    </svg>
  );
}

function MaximizeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 3H3v6" />
      <path d="M3 3l7 7" />
      <path d="M15 3h6v6" />
      <path d="M21 3l-7 7" />
      <path d="M9 21H3v-6" />
      <path d="M3 21l7-7" />
      <path d="M15 21h6v-6" />
      <path d="M21 21l-7-7" />
    </svg>
  );
}

function MinimizeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 5v4H5" />
      <path d="M5 5l4 4" />

      <path d="M15 5v4h4" />
      <path d="M19 5l-4 4" />

      <path d="M9 19v-4H5" />
      <path d="M5 19l4-4" />

      <path d="M15 19v-4h4" />
      <path d="M19 19l-4-4" />
    </svg>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

export default function CustomVideoPlayer({ src, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const settingsRootRef = useRef<HTMLDivElement | null>(null);
  const volumeSliderRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimeout = useRef<number | null>(null);
  const volumeHideTimeout = useRef<number | null>(null);
  const isAdjustingVolumeRef = useRef(false);
  const isHoveringVolumeControlRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("main");
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState("1080p");
  const [speed, setSpeed] = useState(1);
  const [subtitles, setSubtitles] = useState("Off");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>(typeof src === "string" ? src : "");

  useEffect(() => {
    let objectUrl: string | null = null;

    if (typeof src === "string") {
      setVideoSrc(src);
    } else if (src instanceof Blob) {
      objectUrl = URL.createObjectURL(src);
      setVideoSrc(objectUrl);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handleTimeUpdate = () => setCurrentTime(v.currentTime || 0);
    const handleLoadedMetadata = () => setDuration(v.duration || 0);
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("loadedmetadata", handleLoadedMetadata);
    v.addEventListener("play", handlePlay);
    v.addEventListener("pause", handlePause);

    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("loadedmetadata", handleLoadedMetadata);
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
  }, [muted]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!settingsRootRef.current) return;
      if (!settingsRootRef.current.contains(event.target as Node)) {
        setShowSettingsPanel(false);
        setSettingsView("main");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeFullscreenElement = document.fullscreenElement;
      setIsFullscreen(activeFullscreenElement === playerContainerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (hideControlsTimeout.current) {
        window.clearTimeout(hideControlsTimeout.current);
      }
      if (volumeHideTimeout.current) {
        window.clearTimeout(volumeHideTimeout.current);
      }
    };
  }, []);

  const clearHideTimer = () => {
    if (hideControlsTimeout.current) {
      window.clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = null;
    }
  };

  const resetHideControlsTimer = () => {
    clearHideTimer();
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
      setShowVolumeSlider(false);
    }, 1300);
  };

  const clearVolumeHideTimer = () => {
    if (volumeHideTimeout.current) {
      window.clearTimeout(volumeHideTimeout.current);
      volumeHideTimeout.current = null;
    }
  };

  const keepVolumeOpen = () => {
    isHoveringVolumeControlRef.current = true;
    clearVolumeHideTimer();
    setShowVolumeSlider(true);
    setShowControls(true);
    clearHideTimer();
  };

  const scheduleVolumeClose = () => {
    clearVolumeHideTimer();
    volumeHideTimeout.current = window.setTimeout(() => {
      if (isHoveringVolumeControlRef.current || isAdjustingVolumeRef.current) return;
      setShowVolumeSlider(false);
      resetHideControlsTimer();
    }, 180);
  };

  const handleVolumeAreaLeave = () => {
    isHoveringVolumeControlRef.current = false;
    if (isAdjustingVolumeRef.current) return;
    scheduleVolumeClose();
  };

  const handleMouseActivity = () => {
    if (!hasPlayedOnce) return;
    setShowControls(true);
    resetHideControlsTimer();
  };

  const handleMouseLeave = () => {
    clearHideTimer();
    setShowControls(false);
    setShowVolumeSlider(false);
  };

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;

    try {
      if (v.paused) {
        await v.play();
        setHasPlayedOnce(true);
        setShowControls(true);
        resetHideControlsTimer();
      } else {
        v.pause();
        setShowControls(true);
        clearHideTimer();
      }
    } catch {
      // Ignore autoplay/playback interruptions.
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const next = Number(e.target.value);
    v.currentTime = (next / 100) * duration;
    setCurrentTime(v.currentTime);
  };

  const applyVolume = (next: number) => {
    const v = videoRef.current;
    if (!v) return;

    const clamped = Math.max(0, Math.min(1, next));
    const nextMuted = clamped === 0;

    v.volume = clamped;
    v.muted = nextMuted;

    setVolume(clamped);
    setMuted(nextMuted);
  };

  const updateVolumeFromPointer = (clientY: number) => {
    const slider = volumeSliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    applyVolume(ratio);
  };

  const beginVolumeDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isAdjustingVolumeRef.current = true;
    keepVolumeOpen();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    updateVolumeFromPointer(e.clientY);
  };

  const moveVolumeDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isAdjustingVolumeRef.current) return;
    e.stopPropagation();
    updateVolumeFromPointer(e.clientY);
  };

  const endVolumeDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isAdjustingVolumeRef.current) return;
    e.stopPropagation();
    isAdjustingVolumeRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!isHoveringVolumeControlRef.current) {
      scheduleVolumeClose();
    } else {
      clearHideTimer();
    }
  };

  const handleVolumeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "Home" && e.key !== "End") {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Home") {
      applyVolume(0);
      return;
    }

    if (e.key === "End") {
      applyVolume(1);
      return;
    }

    const step = 0.05;
    const baseVolume = muted ? 0 : volume;
    applyVolume(baseVolume + (e.key === "ArrowUp" ? step : -step));
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;

    if (muted || volume === 0) {
      const restoredVolume = volume > 0 ? volume : 0.6;
      v.muted = false;
      v.volume = restoredVolume;
      setMuted(false);
      setVolume(restoredVolume);
      return;
    }

    v.muted = true;
    setMuted(true);
  };

  const handleFullScreen = async () => {
    const container = playerContainerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen errors.
    }
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}`;
    }

    return `${minutes}:${seconds}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const effectiveVolume = muted ? 0 : volume;
  const speedLabel = speed === 1 ? "Normal" : `${speed}x`;

  return (
    <div
      ref={playerContainerRef}
      onMouseEnter={handleMouseActivity}
      onMouseMove={handleMouseActivity}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        width: "100%",
        background: "#000",
        aspectRatio: "16 / 9",
        overflow: "hidden",
      }}
    >
      <style>{`
        .hv-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }

        .hv-progress::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 999px;
          background: transparent;
        }

        .hv-progress::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          margin-top: -5px;
          border-radius: 999px;
          background: ${ACCENT};
          border: 2px solid rgba(255,255,255,0.96);
          box-shadow: 0 0 0 4px rgba(95,37,159,0.15);
          opacity: 0;
          transition: transform 0.16s ease, opacity 0.16s ease;
        }

        .hv-progress:hover::-webkit-slider-thumb,
        .hv-progress:focus-visible::-webkit-slider-thumb {
          opacity: 1;
        }

        .hv-progress::-moz-range-track {
          height: 4px;
          border-radius: 999px;
          background: transparent;
        }

        .hv-progress::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.96);
          border-radius: 999px;
          background: ${ACCENT};
          box-shadow: 0 0 0 4px rgba(95,37,159,0.15);
          opacity: 0;
          transition: transform 0.16s ease, opacity 0.16s ease;
        }

        .hv-progress:hover::-moz-range-thumb,
        .hv-progress:focus-visible::-moz-range-thumb {
          opacity: 1;
        }

        .hv-volume-shell {
          width: 18px;
          height: 100%;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 0;
        }

        .hv-volume-track {
          position: relative;
          width: 6px;
          height: 96px;
          border-radius: 999px;
          background: rgba(255,255,255,0.22);
          cursor: pointer;
          touch-action: none;
        }

        .hv-volume-fill {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 999px;
          background: ${ACCENT};
        }

        .hv-volume-thumb {
          position: absolute;
          left: 50%;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: ${ACCENT};
          border: 2px solid rgba(255,255,255,0.95);
          box-shadow: 0 0 0 4px rgba(95,37,159,0.16);
          transform: translate(-50%, 50%);
          pointer-events: none;
        }
      `}</style>

      <video
        ref={videoRef}
        src={videoSrc}
        poster={poster}
        title={title}
        preload="metadata"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
          background: "#000",
        }}
        onClick={togglePlay}
      />

      {!hasPlayedOnce && poster && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play video"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(112, 60, 168, 0.9)",
            border: "2px solid rgba(255,255,255,0.2)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            transition: "all 0.2s ease",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            backdropFilter: "blur(8px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(112, 60, 168, 1)";
            e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(112, 60, 168, 0.9)";
            e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          }}
        >
          <PlayIcon style={{ width: 32, height: 32, marginLeft: 4 }} />
        </button>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: showControls ? "auto" : "none",
          opacity: showControls ? 1 : 0,
          transition: "opacity 0.18s ease",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.38) 22%, rgba(0,0,0,0.08) 45%, rgba(0,0,0,0) 65%)",
        }}
      >
        <div style={{ padding: "0 16px 14px" }}>
          <input
            className="hv-range hv-progress"
            aria-label="Seek video"
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={handleSeek}
            style={{
              width: "100%",
              height: 14,
              cursor: "pointer",
              background: `linear-gradient(to right, ${ACCENT} 0%, ${ACCENT} ${progress}%, rgba(255,255,255,0.24) ${progress}%, rgba(255,255,255,0.24) 100%)`,
              borderRadius: 999,
            }}
          />

          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Pause video" : "Play video"}
                style={controlButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(95, 37, 159, 0.95)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.24)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                }}
              >
                {playing ? (
                  <PauseIcon style={{ width: 18, height: 18 }} />
                ) : (
                  <PlayIcon style={{ width: 18, height: 18, marginLeft: 2 }} />
                )}
              </button>

              <div
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                onMouseEnter={keepVolumeOpen}
                onMouseLeave={handleVolumeAreaLeave}
                style={{ position: "relative", display: "flex", alignItems: "center" }}
              >
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
                  style={controlButtonStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(95, 37, 159, 0.95)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.24)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                >
                  {muted || volume === 0 ? (
                    <VolumeXIcon style={{ width: 18, height: 18 }} />
                  ) : (
                    <Volume2Icon style={{ width: 18, height: 18 }} />
                  )}
                </button>

                {showVolumeSlider && (
                  <div
                    onMouseEnter={keepVolumeOpen}
                    onMouseLeave={handleVolumeAreaLeave}
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 10px)",
                      right: -8,
                      width: 56,
                      height: 154,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.08)",
                      border: "0.3px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "14px 0",
                    }}
                  >
                    <div className="hv-volume-shell">
                      <div
                        ref={volumeSliderRef}
                        className="hv-volume-track"
                        role="slider"
                        aria-label="Volume"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(effectiveVolume * 100)}
                        tabIndex={0}
                        onPointerDown={beginVolumeDrag}
                        onPointerMove={moveVolumeDrag}
                        onPointerUp={endVolumeDrag}
                        onPointerCancel={endVolumeDrag}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={handleVolumeKeyDown}
                      >
                        <div
                          className="hv-volume-fill"
                          style={{ height: `${effectiveVolume * 100}%` }}
                        />
                        <div
                          className="hv-volume-thumb"
                          style={{ bottom: `${effectiveVolume * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div ref={settingsRootRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  aria-label="Settings"
                  onClick={() => {
                    setShowSettingsPanel((prev) => !prev);
                    setSettingsView("main");
                    setShowControls(true);
                    clearHideTimer();
                  }}
                  style={controlButtonStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(95, 37, 159, 0.95)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.24)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                >
                  <SettingsIcon style={{ width: 18, height: 18 }} />
                </button>

                {showSettingsPanel && (
                  <div
                    onMouseEnter={() => {
                      setShowControls(true);
                      clearHideTimer();
                    }}
                    onMouseLeave={() => {
                      resetHideControlsTimer();
                    }}
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 10px)",
                      right: 0,
                      width: 250,
                      borderRadius: 16,
                      background: "rgba(5,5,5,0.98)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 24px 54px rgba(0,0,0,0.4)",
                      overflow: "hidden",
                    }}
                  >
                    {settingsView === "main" ? (
                      <>
                        <SettingsRow
                          label="Quality"
                          value={quality}
                          onClick={() => setSettingsView("quality")}
                        />
                        <SettingsRow
                          label="Speed"
                          value={speedLabel}
                          onClick={() => setSettingsView("speed")}
                        />
                        <SettingsRow
                          label="CC/subtitles"
                          value={subtitles}
                          onClick={() => setSettingsView("subtitles")}
                        />
                        <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "6px 14px" }} />
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "12px 16px 14px",
                            color: "rgba(255,255,255,0.88)",
                            fontSize: 14,
                          }}
                        >
                          <InfoIcon style={{ width: 16, height: 16 }} />
                          <span>Debug log</span>
                        </div>
                      </>
                    ) : (
                      <div>
                        <button
                          type="button"
                          onClick={() => setSettingsView("main")}
                          style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "14px 14px 10px",
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          <ChevronLeftIcon style={{ width: 16, height: 16 }} />
                          <span>
                            {settingsView === "quality"
                              ? "Quality"
                              : settingsView === "speed"
                                ? "Speed"
                                : "CC/subtitles"}
                          </span>
                        </button>

                        {(settingsView === "quality"
                          ? qualityOptions
                          : settingsView === "speed"
                            ? speedOptions.map((option) => (option === 1 ? "Normal" : `${option}x`))
                            : subtitleOptions
                        ).map((option) => {
                          const isSelected =
                            settingsView === "quality"
                              ? quality === option
                              : settingsView === "speed"
                                ? speedLabel === option
                                : subtitles === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                if (settingsView === "quality") {
                                  setQuality(option);
                                } else if (settingsView === "speed") {
                                  const numeric = option === "Normal" ? 1 : Number(String(option).replace("x", ""));
                                  setSpeed(numeric);
                                } else {
                                  setSubtitles(option);
                                }
                              }}
                              style={{
                                width: "100%",
                                background: "transparent",
                                border: "none",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 16px",
                                cursor: "pointer",
                                fontSize: 14,
                              }}
                            >
                              <span>{option}</span>
                              {isSelected ? <CheckIcon style={{ width: 16, height: 16, color: ACCENT }} /> : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleFullScreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                style={controlButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(95, 37, 159, 0.95)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.24)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                }}
              >
                {isFullscreen ? (
                  <MinimizeIcon style={{ width: 18, height: 18 }} />
                ) : (
                  <MaximizeIcon style={{ width: 18, height: 18 }} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.94)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.82)" }}>
        <span>{value}</span>
        <ChevronRightIcon style={{ width: 16, height: 16 }} />
      </span>
    </button>
  );
}

const controlButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};
