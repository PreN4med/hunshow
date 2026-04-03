"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Link from "next/link";

type ChatMessage = {
  id: string;
  username: string;
  message: string;
  timestamp: string;
};

export default function WatchStreamPage() {
  const params = useParams();
  const streamId = params.id as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const chunkQueueRef = useRef<ArrayBuffer[]>([]);
  const [streamInfo, setStreamInfo] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [streamEnded, setStreamEnded] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    // Get username from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUsername(
      user.firstName ? `${user.firstName} ${user.lastName}` : "Anonymous",
    );

    // Fetch stream info
    async function fetchStreamInfo() {
      try {
        const res = await fetch(`http://localhost:5000/stream/${streamId}`);
        const data = await res.json();
        setStreamInfo(data);

        // Load chat history
        const chatRes = await fetch(
          `http://localhost:5000/stream/${streamId}/chat`,
        );
        const chatData = await chatRes.json();
        setMessages(chatData);
      } catch (err) {
        console.error("Failed to fetch stream info:", err);
      }
    }

    fetchStreamInfo();

    // Set up MediaSource for video playback
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;

    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(mediaSource);
    }

    mediaSource.addEventListener("sourceopen", () => {
      const sourceBuffer = mediaSource.addSourceBuffer(
        "video/webm;codecs=vp9,opus",
      );
      sourceBufferRef.current = sourceBuffer;

      sourceBuffer.addEventListener("updateend", () => {
        if (chunkQueueRef.current.length > 0 && !sourceBuffer.updating) {
          sourceBuffer.appendBuffer(chunkQueueRef.current.shift()!);
        }
      });
    });

    // Connect to WebSocket
    socketRef.current = io("http://localhost:5000/stream");

    socketRef.current.on("connect", () => {
      socketRef.current?.emit("join-stream", { streamId });
    });

    socketRef.current.on("viewer-count", ({ count }: { count: number }) => {
      setViewerCount(count);
    });

    socketRef.current.on("chat-message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current.on("stream-chunk", (chunk: ArrayBuffer) => {
      if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
        sourceBufferRef.current.appendBuffer(chunk);
      } else {
        chunkQueueRef.current.push(chunk);
      }
      videoRef.current?.play().catch(() => {});
    });

    socketRef.current.on("stream-ended", () => {
      setStreamEnded(true);
    });

    return () => {
      socketRef.current?.emit("leave-stream", { streamId });
      socketRef.current?.disconnect();
    };
  }, [streamId]);

  function handleSendMessage() {
    if (!newMessage.trim()) return;

    socketRef.current?.emit("chat-message", {
      streamId,
      message: newMessage,
      username,
    });

    setNewMessage("");
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <Link href="/" style={{ color: "var(--p)", fontWeight: 500 }}>
        ← Back to Browse
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 350px",
          gap: 24,
          marginTop: 16,
        }}
      >
        {/* Video Player */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>
              {streamInfo?.title || "Live Stream"}
            </h1>
            {!streamEnded && (
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
            )}
          </div>

          {streamEnded ? (
            <div
              style={{
                background: "#f5f5f5",
                borderRadius: 10,
                padding: 40,
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 600 }}>Stream has ended</p>
              <Link href="/" style={{ color: "var(--p)" }}>
                Back to Browse
              </Link>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              controls
              style={{ width: "100%", borderRadius: 10, background: "#000" }}
            />
          )}

          <p style={{ opacity: 0.6, fontSize: 13, marginTop: 8 }}>
            {viewerCount} viewers watching
          </p>
        </div>

        {/* Chat */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid #e5e5e5",
            borderRadius: 10,
            overflow: "hidden",
            height: 500,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e5e5e5",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Live Chat
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.length === 0 && (
              <p
                style={{
                  opacity: 0.5,
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 20,
                }}
              >
                No messages yet. Be the first to chat!
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {m.username}:{" "}
                </span>
                <span style={{ fontSize: 13 }}>{m.message}</span>
              </div>
            ))}
          </div>

          {/* Input */}
          <div
            style={{
              padding: 12,
              borderTop: "1px solid #e5e5e5",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              placeholder="Send a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 13,
              }}
            />
            <button
              onClick={handleSendMessage}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--p)",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
