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

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setError("Could not access camera/microphone.");
      }
    }
    setupCamera();

    return () => {
      socketRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleGoLive = async () => {
    if (!title) return setError("Please enter a title");
    try {
      const res = await fetch(`${API_URL}/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-123", title }),
      });
      const data = await res.json();
      setStreamId(data.streamId);

      // Force H.264 so the server doesn't have to transcode
      const options = { mimeType: "video/webm;codecs=h264" };
      const actualOptions = MediaRecorder.isTypeSupported(options.mimeType)
        ? options
        : { mimeType: "video/webm" };

      const mediaRecorder = new MediaRecorder(
        streamRef.current!,
        actualOptions,
      );
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
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

      // Send a chunk every 1 second
      mediaRecorder.start(1000);
      setStreaming(true);
      setError("");
      socketRef.current?.emit("join-stream", { streamId: data.streamId });
    } catch (err) {
      setError("Failed to start stream.");
    }
  };

  const handleEndStream = () => {
    mediaRecorderRef.current?.stop();
    setStreaming(false);
    if (streamId) {
      socketRef.current?.emit("end-stream", { streamId });
      router.push("/");
    }
  };

  return (
    <main style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h1>Broadcast Live</h1>
        {!streaming && (
          <input
            placeholder="Stream Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
          />
        )}
        {error && <p style={{ color: "red" }}>{error}</p>}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", borderRadius: 10, background: "#000" }}
        />
        {!streaming ? (
          <button
            onClick={handleGoLive}
            style={{
              padding: 12,
              background: "red",
              color: "white",
              borderRadius: 10,
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
