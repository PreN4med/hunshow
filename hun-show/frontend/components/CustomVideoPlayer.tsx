"use client";
import React, { useRef, useState, useEffect } from "react";

type Props = {
  src: string | File;
  poster?: string;
  title?: string;
};

export default function CustomVideoPlayer({ src, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [videoSrc, setVideoSrc] = useState<string>(
    typeof src === "string" ? src : "",
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => setCurrentTime(v.currentTime);
    const onDuration = () => setDuration(v.duration || 0);

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onDuration);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onDuration);
    };
  }, []);

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

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.currentTime = (val / 100) * (duration || 0);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    setVolume(val);
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleFullScreen = async () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await container.requestFullscreen();
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Video Container */}
      <div 
        style={{ 
          position: "relative", 
          background: "#000",
          paddingBottom: "56.25%",
          paddingTop: 0,
          height: 0,
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          style={{ 
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          onClick={togglePlay}
        />
        
        {/* Center Play Button */}
        <button
          onClick={togglePlay}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(95, 37, 159, 0.85)",
            color: "#fff",
            border: "none",
            width: 70,
            height: 70,
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            transition: "all 0.2s ease",
            opacity: playing ? 0 : 1,
            pointerEvents: playing ? "none" : "auto",
            backdropFilter: "blur(4px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(95, 37, 159, 1)";
            e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(95, 37, 159, 0.85)";
            e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
          }}
        >
          {playing ? "⏸" : "▶"}
        </button>
      </div>

      {/* Controls Bar */}
      <div style={{ 
        background: "linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))",
        padding: "16px",
        paddingTop: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>
        {/* Progress Bar */}
        <div style={{ position: "relative", height: 6 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={handleSeek}
            style={{
              width: "100%",
              height: 6,
              borderRadius: 3,
              background: "#ccc",
              outline: "none",
              cursor: "pointer",
              accentColor: "var(--p, #5F259F)",
              WebkitAppearance: "none",
              appearance: "none",
            } as React.CSSProperties}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              appearance: none;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: var(--p, #5F259F);
              cursor: pointer;
              transition: all 0.2s;
            }
            input[type="range"]::-webkit-slider-thumb:hover {
              transform: scale(1.3);
              box-shadow: 0 0 10px rgba(95, 37, 159, 0.5);
            }
            input[type="range"]::-moz-range-thumb {
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: var(--p, #5F259F);
              cursor: pointer;
              border: none;
              transition: all 0.2s;
            }
            input[type="range"]::-moz-range-thumb:hover {
              transform: scale(1.3);
              box-shadow: 0 0 10px rgba(95, 37, 159, 0.5);
            }
          `}</style>
        </div>

        {/* Bottom Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          {/* Left side: Play button and time */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={togglePlay}
              style={{
                background: "rgba(95, 37, 159, 0.7)",
                color: "#fff",
                border: "none",
                width: 32,
                height: 32,
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(95, 37, 159, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(95, 37, 159, 0.7)";
              }}
            >
              {playing ? "⏸" : "▶"}
            </button>
            
            <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Right side: Volume and fullscreen */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#fff", fontSize: 14 }}>🔊</span>
              <input
                aria-label="volume"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolume}
                style={{
                  width: 80,
                  height: 4,
                  cursor: "pointer",
                  accentColor: "var(--p, #5F259F)",
                  WebkitAppearance: "none",
                  appearance: "none",
                } as React.CSSProperties}
              />
            </div>

            <button
              onClick={handleFullScreen}
              style={{
                background: "rgba(95, 37, 159, 0.7)",
                color: "#fff",
                border: "none",
                width: 32,
                height: 32,
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(95, 37, 159, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(95, 37, 159, 0.7)";
              }}
            >
              ⛶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
