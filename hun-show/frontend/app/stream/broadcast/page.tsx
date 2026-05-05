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
      stopMedia();

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
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f3f0ff 0%, #ede9fe 50%, #e0d9ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "20px",
          width: "100%",
          maxWidth: "1100px",
          alignItems: "stretch",
        }}
      >
        {/* Left: Video Preview */}
        <div
          style={{
            flex: 1,
            background: "#0f0f0f",
            borderRadius: "16px",
            overflow: "hidden",
            position: "relative",
            minHeight: "420px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!activeSource && (
            <div
              style={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                color: "#fff",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p style={{ fontWeight: 700, fontSize: "16px", margin: 0 }}>
                No source selected
              </p>
              <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                Select camera or screen to preview your stream.
              </p>
            </div>
          )}

          {streaming && (
            <div
              style={{
                position: "absolute",
                top: "14px",
                left: "14px",
                background: "#ef4444",
                color: "white",
                fontSize: "12px",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "6px",
                letterSpacing: "0.05em",
                zIndex: 3,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "white",
                  display: "inline-block",
                }}
              />
              LIVE
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transform: activeSource === "camera" ? "scaleX(-1)" : "none",
            }}
          />
        </div>

        {/* Right: Settings Panel */}
        <div
          style={{
            width: "300px",
            background: "#ffffff",
            borderRadius: "16px",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#9ca3af",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 4px",
              }}
            >
              STREAM SETUP
            </p>
            <h2
              style={{
                fontSize: "26px",
                fontWeight: 700,
                color: "#111827",
                margin: 0,
              }}
            >
              Details
            </h2>
          </div>

          {!streaming && (
            <>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  Stream Title
                </label>
                <input
                  placeholder="Enter stream title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #e5e7eb",
                    fontSize: "14px",
                    color: "#111827",
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#f9fafb",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "10px",
                  }}
                >
                  Source
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {/* Camera option */}
                  <div
                    onClick={() => selectSource("camera")}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: `2px solid ${activeSource === "camera" ? "#7c3aed" : "#e5e7eb"}`,
                      background:
                        activeSource === "camera" ? "#f5f3ff" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#111827",
                      }}
                    >
                      Use Camera
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      Camera + microphone
                    </p>
                  </div>

                  {/* Screen share option */}
                  <div
                    onClick={() => selectSource("screen")}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: `2px solid ${activeSource === "screen" ? "#7c3aed" : "#e5e7eb"}`,
                      background:
                        activeSource === "screen" ? "#f5f3ff" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#111827",
                      }}
                    >
                      Share Screen
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      Screen + system audio
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <p
              style={{
                color: "#dc2626",
                fontSize: "13px",
                margin: 0,
                fontWeight: 500,
              }}
            >
              {error}
            </p>
          )}

          {streaming && streamId && (
            <div
              style={{
                padding: "14px",
                background: "#f0fdf4",
                borderRadius: "10px",
                border: "1px solid #86efac",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#166534",
                  margin: "0 0 6px",
                  fontWeight: 600,
                }}
              >
                🔴 Live Now!
              </p>
              <code
                style={{
                  fontSize: "11px",
                  wordBreak: "break-all",
                  color: "#15803d",
                }}
              >
                https://hunshow.vercel.app/stream/watch/{streamId}
              </code>
            </div>
          )}

          <div style={{ marginTop: "auto" }}>
            {!streaming ? (
              <>
                <button
                  disabled={!activeSource}
                  onClick={handleGoLive}
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: "12px",
                    border: "none",
                    background: activeSource ? "#7c3aed" : "#ddd6fe",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "15px",
                    cursor: activeSource ? "pointer" : "not-allowed",
                    transition: "background 0.2s ease",
                  }}
                >
                  {activeSource ? "Go Live" : "Select a Source to Start"}
                </button>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    marginTop: "12px",
                    lineHeight: "1.5",
                  }}
                >
                  Tip: use screen share for gameplay, presentations, or editing
                  sessions. Use camera for face-to-camera streams.
                </p>
              </>
            ) : (
              <button
                onClick={handleEndStream}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: "12px",
                  border: "1.5px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                End Stream
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
