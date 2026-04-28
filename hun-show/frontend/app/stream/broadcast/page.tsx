"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Header from "@/components/Header";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

type SourceType = "camera" | "screen" | null;

export default function BroadcastPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const streamingRef = useRef(false);

  const [streaming, setStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [activeSource, setActiveSource] = useState<SourceType>(null);

  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  useEffect(() => {
    socketRef.current = io(`${API_URL}/stream`, {
      path: "/socket.io/",
      transports: ["websocket"],
    });

    return () => {
      socketRef.current?.disconnect();
      stopMedia();
    };
  }, []);

  useEffect(() => {
    if (!streamId) return;
    setLiveUrl(`${window.location.origin}/stream/watch/${streamId}`);
  }, [streamId]);

  function stopMedia() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function selectSource(type: "camera" | "screen") {
    try {
      setError("");
      stopMedia();

      if (!navigator.mediaDevices) {
        setError("Your browser does not support camera or screen sharing.");
        return;
      }

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
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setActiveSource(type);

      const videoTrack = stream.getVideoTracks()[0];

      if (videoTrack) {
        videoTrack.onended = () => {
          if (streamingRef.current) {
            handleEndStream();
          } else {
            stopMedia();
            setActiveSource(null);
          }
        };
      }
    } catch (err) {
      console.error(err);
      setError(
        type === "screen"
          ? "Screen sharing was blocked or canceled."
          : "Camera access was blocked or unavailable.",
      );
    }
  }

  function getRecorderOptions(): MediaRecorderOptions {
    const possibleTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    const supportedType = possibleTypes.find((type) =>
      MediaRecorder.isTypeSupported(type),
    );

    if (supportedType) {
      return {
        mimeType: supportedType,
        videoBitsPerSecond: 3000000,
      };
    }

    return {
      videoBitsPerSecond: 3000000,
    };
  }

  async function notifyStreamEnded(id: string) {
    const payload = JSON.stringify({
      streamId: id,
      deleteSegments: true,
    });

    const endpoints = [
      {
        url: `${API_URL}/stream/${id}`,
        options: {
          method: "DELETE",
        },
      },
      {
        url: `${API_URL}/stream/${id}/end`,
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        },
      },
      {
        url: `${API_URL}/stream/end`,
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        },
      },
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint.url, endpoint.options);

        if (res.ok) {
          return true;
        }
      } catch {
        continue;
      }
    }

    return false;
  }

  async function handleGoLive() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Please enter a stream title.");
      return;
    }

    if (!streamRef.current) {
      setError("Please select your camera or screen first.");
      return;
    }

    const userData = localStorage.getItem("user");

    if (!userData) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userData);
    const userId = user.id || user._id;

    if (!userId) {
      setError("Could not find your user account. Please log in again.");
      return;
    }

    try {
      setError("");

      const res = await fetch(`${API_URL}/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title: cleanTitle }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to start stream.");
        return;
      }

      const newStreamId = data.streamId || data.id || data._id;

      if (!newStreamId) {
        setError("Stream started, but no stream ID was returned.");
        return;
      }

      setStreamId(newStreamId);

      const mediaRecorder = new MediaRecorder(
        streamRef.current,
        getRecorderOptions(),
      );

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size <= 0) return;

        const formData = new FormData();
        formData.append("chunk", event.data);
        formData.append("streamId", newStreamId);

        fetch(`${API_URL}/stream/chunk`, {
          method: "POST",
          body: formData,
        }).catch(console.error);
      };

      mediaRecorder.start(2000);
      setStreaming(true);

      socketRef.current?.emit("broadcast-started", { streamId: newStreamId });
    } catch (err) {
      console.error(err);
      setError("Failed to start stream.");
    }
  }

  async function handleEndStream() {
    const endingStreamId = streamId;

    try {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
    } catch {
      // ignore recorder stop errors
    }

    setStreaming(false);
    streamingRef.current = false;
    stopMedia();
    setActiveSource(null);
    setStreamId(null);
    setLiveUrl("");

    if (endingStreamId) {
      socketRef.current?.emit("end-stream", { streamId: endingStreamId });
      await notifyStreamEnded(endingStreamId);
    }

    router.push("/stream");
    router.refresh();
  }

  async function copyLiveUrl() {
    if (!liveUrl) return;

    try {
      await navigator.clipboard.writeText(liveUrl);
    } catch {
      setError("Could not copy the stream link.");
    }
  }

  return (
    <>
      <Header page="home" />

      <main className="container broadcastPage">
        <div className="broadcastTopRow">
          <Link href="/stream" className="watchBackBtn">
            ← Back to Streaming
          </Link>
        </div>

        <section className="broadcastHeader">
          <div className="broadcastMetaRow">
            <p className="uploadEyebrow">Broadcast studio</p>

            <span className={`broadcastStatus ${streaming ? "isLive" : ""}`}>
              {streaming ? "● Live" : activeSource ? "Ready" : "Setup"}
            </span>
          </div>
        </section>

        <div className="broadcastLayout">
          <section className="broadcastPreviewCard">
            <div className="broadcastPreviewShell">
              {!activeSource && (
                <div className="broadcastNoSource">
                  <div className="broadcastNoSourceIcon">▶</div>
                  <p>No source selected</p>
                  <span>Select camera or screen to preview your stream.</span>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`broadcastPreviewVideo ${
                  activeSource === "camera" ? "isMirrored" : ""
                }`}
              />
            </div>

            {streaming && streamId && (
              <div className="broadcastLivePanel">
                <div>
                  <p className="broadcastLiveLabel">Live now</p>
                  <p className="broadcastLiveUrl">{liveUrl}</p>
                </div>

                <button
                  type="button"
                  className="btn btnGhost broadcastCopyBtn"
                  onClick={copyLiveUrl}
                >
                  Copy Link
                </button>
              </div>
            )}
          </section>

          <aside className="broadcastControlCard">
            <div className="broadcastControlHeader">
              <p className="uploadEyebrow">Stream setup</p>
              <h2>Details</h2>
            </div>

            <label className="broadcastField">
              <span>Stream Title</span>
              <input
                className="input broadcastInput"
                placeholder="Enter stream title..."
                value={title}
                disabled={streaming}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <div className="broadcastField">
              <span>Source</span>

              <div className="broadcastSourceGrid">
                <button
                  type="button"
                  disabled={streaming}
                  className={`broadcastSourceBtn ${
                    activeSource === "camera" ? "isActive" : ""
                  }`}
                  onClick={() => selectSource("camera")}
                >
                  <strong>Use Camera</strong>
                  <small>Camera + microphone</small>
                </button>

                <button
                  type="button"
                  disabled={streaming}
                  className={`broadcastSourceBtn ${
                    activeSource === "screen" ? "isActive" : ""
                  }`}
                  onClick={() => selectSource("screen")}
                >
                  <strong>Share Screen</strong>
                  <small>Screen + system audio</small>
                </button>
              </div>
            </div>

            {error && <p className="broadcastError">{error}</p>}

            {!streaming ? (
              <button
                type="button"
                className="btn btnPrimary broadcastMainBtn"
                disabled={!activeSource || !title.trim()}
                onClick={handleGoLive}
              >
                {activeSource ? "Go Live" : "Select a Source to Start"}
              </button>
            ) : (
              <button
                type="button"
                className="broadcastEndBtn"
                onClick={handleEndStream}
              >
                End Stream
              </button>
            )}

            <p className="broadcastHelper">
              Tip: use screen share for gameplay, presentations, or editing
              sessions. Use camera for face-to-camera streams.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}