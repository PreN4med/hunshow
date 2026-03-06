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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ position: "relative", background: "#000" }}>
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          style={{ width: "100%", display: "block" }}
          onClick={togglePlay}
        />
        <button
          onClick={togglePlay}
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            border: "none",
            padding: "8px 10px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={duration ? (currentTime / duration) * 100 : 0}
            onChange={handleSeek}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#444" }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <input
            aria-label="volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolume}
            style={{ width: 90 }}
          />

          <button
            onClick={handleFullScreen}
            style={{ padding: "6px 8px", borderRadius: 6 }}
          >
            Full
          </button>
        </div>
      </div>
    </div>
  );
}
