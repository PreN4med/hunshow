"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function BroadcastPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  // Track which source is active: null (none), 'camera', or 'screen'
  const [activeSource, setActiveSource] = useState<"camera" | "screen" | null>(
    null,
  );

  useEffect(() => {
    socketRef.current = io(`${API_URL}/stream`);
    return () => {
      socketRef.current?.disconnect();
      stopMedia();
    };
  }, []);

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const selectSource = async (type: "camera" | "screen") => {
    try {
      setError("");
      stopMedia(); // Clear previous stream before starting new one

      let stream: MediaStream;
      if (type === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 30 },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && "contentHint" in videoTrack) {
          (videoTrack as any).contentHint = "motion";
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActiveSource(type);

      // Handle user clicking "Stop Sharing" on browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (streaming) handleEndStream();
        else {
          stopMedia();
          setActiveSource(null);
        }
      };
    } catch (err) {
      console.error(err);
      setError(`Failed to access ${type}. It may be blocked or unsupported.`);
    }
  };

  const handleGoLive = async () => {
    if (!title) return setError("Please enter a title");
    if (!streamRef.current)
      return setError("Please select a camera or screen first");

    try {
      const res = await fetch(`${API_URL}/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-123", title }),
      });
      const data = await res.json();
      setStreamId(data.streamId);

      const options = {
        mimeType: "video/webm;codecs=h264",
        videoBitsPerSecond: 3000000,
      };
      const actualOptions = MediaRecorder.isTypeSupported(options.mimeType)
        ? options
        : { mimeType: "video/webm", videoBitsPerSecond: 3000000 };

      const mediaRecorder = new MediaRecorder(streamRef.current, actualOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const formData = new FormData();
          formData.append("chunk", event.data);
          formData.append("streamId", data.streamId);
          fetch(`${API_URL}/stream/chunk`, {
            method: "POST",
            body: formData,
          }).catch(console.error);
        }
      };

      mediaRecorder.start(500);
      setStreaming(true);
      socketRef.current?.emit("join-stream", { streamId: data.streamId });
    } catch (err) {
      setError("Failed to start stream.");
    }
  };

  const handleEndStream = () => {
    mediaRecorderRef.current?.stop();
    setStreaming(false);
    stopMedia();
    router.push("/");
  };

  return (
    <main
      style={{ padding: 20, maxWidth: 800, margin: "0 auto", color: "black" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h1>Broadcast Studio</h1>

        {!streaming && (
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <input
              placeholder="Enter Stream Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid #ccc",
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => selectSource("camera")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: "none",
                  background: activeSource === "camera" ? "#22c55e" : "#e5e7eb",
                  color: activeSource === "camera" ? "white" : "black",
                }}
              >
                Use Camera
              </button>
              <button
                onClick={() => selectSource("screen")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: "none",
                  background: activeSource === "screen" ? "#22c55e" : "#e5e7eb",
                  color: activeSource === "screen" ? "white" : "black",
                }}
              >
                Share Screen
              </button>
            </div>
          </div>
        )}

        {error && <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>}

        {/* Mirror the video ONLY if it's the camera */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: "100%",
            borderRadius: 10,
            background: "#000",
            transform: activeSource === "camera" ? "scaleX(-1)" : "none",
          }}
        />

        {streaming && streamId && (
          <div
            style={{
              padding: 15,
              background: "#f0f9ff",
              borderRadius: 10,
              border: "1px solid #bae6fd",
            }}
          >
            <p style={{ fontSize: 14, color: "#0369a1", margin: 0 }}>
              <strong>Live Now!</strong> URL:
            </p>
            <code style={{ wordBreak: "break-all" }}>
              https://hunshow.vercel.app/stream/watch/
              {streamId}
            </code>
          </div>
        )}

        {!streaming ? (
          <button
            disabled={!activeSource}
            onClick={handleGoLive}
            style={{
              padding: 15,
              background: activeSource ? "red" : "#ccc",
              color: "white",
              borderRadius: 10,
              cursor: activeSource ? "pointer" : "not-allowed",
              fontWeight: "bold",
              border: "none",
            }}
          >
            {activeSource ? "Go Live" : "Select a Source to Start"}
          </button>
        ) : (
          <button
            onClick={handleEndStream}
            style={{
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            End Stream
          </button>
        )}
      </div>
    </main>
  );
}
