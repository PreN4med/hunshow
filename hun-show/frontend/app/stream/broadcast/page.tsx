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
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    socketRef.current = io(`${API_URL}/stream`);

    socketRef.current.on("viewer-count", ({ count }: { count: number }) => {
      setViewerCount(count);
    });

    socketRef.current.on("connect_error", () => {
      setError("Failed to connect to stream server");
    });

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError(
          "Could not access camera/microphone. Please allow access and try again.",
        );
      }
    }

    setupCamera();

    return () => {
      socketRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function handleGoLive() {
    if (!title) {
      setError("Please enter a stream title.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.id) {
      setError("You must be logged in to stream.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title }),
      });

      const data = await res.json();
      setStreamId(data.streamId);

      socketRef.current?.emit("join-stream", { streamId: data.streamId });

      const stream = streamRef.current!;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9,opus",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        console.log("Chunk generated, size:", event.data.size);
        if (event.data.size > 0) {
          const formData = new FormData();
          formData.append("chunk", event.data, "chunk.webm");
          formData.append("streamId", data.streamId);

          await fetch(`${API_URL}/stream/chunk`, {
            method: "POST",
            body: formData,
          }).catch(console.error);
        }
      };

      mediaRecorder.start(2000);
      setStreaming(true);
      setError("");
    } catch (err) {
      setError("Failed to start stream. Please try again.");
    }
  }

  function handleEndStream() {
    mediaRecorderRef.current?.stop();
    socketRef.current?.emit("end-stream", { streamId });
    setStreaming(false);
    setStreamId(null);
    router.push("/");
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Go Live</h1>

      {/* Always render video element so srcObject is never lost */}
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {streaming && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                background: "red",
                color: "white",
                padding: "4px 10px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              LIVE
            </span>
            <span style={{ opacity: 0.75, fontSize: 14 }}>
              {viewerCount} viewers
            </span>
          </div>
        )}

        {!streaming && (
          <input
            placeholder="Stream title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
          />
        )}

        {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}

        {/* Single video element — always mounted */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", borderRadius: 10, background: "#000" }}
        />

        {streaming && streamId && (
          <p style={{ fontSize: 13, opacity: 0.6 }}>
            Share this link with viewers:{" "}
            <strong>localhost:3000/stream/watch/{streamId}</strong>
          </p>
        )}

        {!streaming ? (
          <button
            onClick={handleGoLive}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "none",
              background: "red",
              color: "white",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Go Live
          </button>
        ) : (
          <button
            onClick={handleEndStream}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ccc",
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
