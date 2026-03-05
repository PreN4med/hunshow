"use client";
import React, { useState } from "react";
import CustomVideoPlayer from "./CustomVideoPlayer";

type Props = {
  initialSrc: string;
  poster?: string;
  title?: string;
};

export default function FilePlayerWrapper({
  initialSrc,
  poster,
  title,
}: Props) {
  const [source, setSource] = useState<string | File>(initialSrc);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSource(f);
  };

  const reset = () => setSource(initialSrc);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <label style={{ cursor: "pointer" }}>
          Upload MP4
          <input
            type="file"
            accept="video/mp4,video/*"
            onChange={onFile}
            style={{ marginLeft: 8 }}
          />
        </label>
        <button onClick={reset} style={{ padding: "6px 8px", borderRadius: 6 }}>
          Reset
        </button>
      </div>

      <CustomVideoPlayer src={source} poster={poster} title={title} />
    </div>
  );
}
