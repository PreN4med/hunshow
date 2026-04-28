"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import Hls from "hls.js";
import Header from "@/components/Header";

type ChatMessage = {
  id: string;
  username: string;
  message: string;
  timestamp: string;
};

type StreamInfo = {
  streamId?: string;
  title?: string;
  creatorName?: string;
  username?: string;
  status?: string;
  viewerCount?: number;
};

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export default function WatchStreamPage() {
  const params = useParams();
  const streamId = params.id as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [streamEnded, setStreamEnded] = useState(false);
  const [username, setUsername] = useState("Anonymous");
  const [playlistReady, setPlaylistReady] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (user.firstName) {
        setUsername(`${user.firstName} ${user.lastName || ""}`.trim());
      }
    } catch {
      setUsername("Anonymous");
    }

    async function fetchStreamInfo() {
      try {
        const res = await fetch(`${API_URL}/stream/${streamId}`, {
          cache: "no-store",
        });

        const data = await res.json();
        setStreamInfo(data);

        if (data?.status === "ended") {
          setStreamEnded(true);
        }

        const chatRes = await fetch(`${API_URL}/stream/${streamId}/chat`, {
          cache: "no-store",
        });

        const chatData = await chatRes.json();

        if (Array.isArray(chatData)) {
          setMessages(chatData);
        }
      } catch (err) {
        console.error("Failed to fetch stream info:", err);
      }
    }

    fetchStreamInfo();

    const playlistPoller = window.setInterval(async () => {
      try {
        const playlistUrl = `${API_URL}/stream/${streamId}/playlist.m3u8`;
        const res = await fetch(playlistUrl, { method: "HEAD" });

        if (res.ok && videoRef.current && !hlsRef.current) {
          window.clearInterval(playlistPoller);
          setPlaylistReady(true);

          if (Hls.isSupported()) {
            const hls = new Hls({
              liveSyncDurationCount: 2,
              liveMaxLatencyDurationCount: 6,
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
              manifestLoadingTimeOut: 20000,
              manifestLoadingMaxRetry: 6,
              fragLoadingTimeOut: 30000,
              fragLoadingMaxRetry: 6,
              levelLoadingTimeOut: 20000,
              levelLoadingMaxRetry: 4,
              lowLatencyMode: false,
              enableWorker: true,
            });

            hlsRef.current = hls;
            hls.loadSource(playlistUrl);
            hls.attachMedia(videoRef.current);

            hls.on(Hls.Events.ERROR, (_event, data) => {
              console.warn("[HLS] Error:", data.type, data.details, data.fatal);

              if (!data.fatal) return;

              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                hls.startLoad();
                return;
              }

              if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
                return;
              }

              hls.destroy();
            });
          } else if (
            videoRef.current.canPlayType("application/vnd.apple.mpegurl")
          ) {
            videoRef.current.src = playlistUrl;
            videoRef.current.play().catch(() => {});
          }
        }
      } catch {
        // playlist may not be ready yet
      }
    }, 3000);

    socketRef.current = io(`${API_URL}/stream`, {
      path: "/socket.io/",
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      socketRef.current?.emit("join-stream", { streamId });
    });

    socketRef.current.on("viewer-count", ({ count }: { count: number }) => {
      setViewerCount(count);
    });

    socketRef.current.on("chat-message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current.on("stream-ended", () => {
      setStreamEnded(true);
      setPlaylistReady(false);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      window.clearInterval(playlistPoller);
    });

    return () => {
      window.clearInterval(playlistPoller);
      socketRef.current?.emit("leave-stream", { streamId });
      socketRef.current?.disconnect();
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [streamId]);

  function handleSendMessage() {
    const cleanMessage = newMessage.trim();

    if (!cleanMessage || streamEnded) return;

    socketRef.current?.emit("chat-message", {
      streamId,
      message: cleanMessage,
      username,
    });

    setNewMessage("");
  }

  return (
    <>
      <Header page="home" />

      <main className="container streamWatchPage">
        <div className="streamWatchTopRow">
          <Link href="/stream" className="watchBackBtn">
            ← Back to Streaming
          </Link>
        </div>

        <div className="streamWatchLayout">
          <section className="streamWatchMain">
            <div className="streamWatchTitleRow">
              <div>
                <p className="streamWatchEyebrow">Live stream</p>
                <h1 className="streamWatchTitle">
                  {streamInfo?.title || "Live Stream"}
                </h1>
              </div>

              {!streamEnded ? (
                <span className="streamWatchLiveBadge">● LIVE</span>
              ) : (
                <span className="streamWatchEndedBadge">Ended</span>
              )}
            </div>

            <div className="streamWatchPlayerCard">
              <div className="streamWatchPlayerShell">
                {streamEnded ? (
                  <div className="streamWatchState">
                    <div className="streamWatchStateIcon">✓</div>
                    <h2>Stream has ended</h2>
                    <p>This live stream is no longer available.</p>
                    <Link href="/stream" className="btn btnPrimary">
                      Back to Streaming
                    </Link>
                  </div>
                ) : (
                  <>
                    {!playlistReady && (
                      <div className="streamWatchState">
                        <div className="streamWatchStateIcon">▶</div>
                        <h2>Waiting for stream to start...</h2>
                        <p>The live video will appear here once it is ready.</p>
                      </div>
                    )}

                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      controls
                      className={`streamWatchVideo ${
                        playlistReady ? "isVisible" : ""
                      }`}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="streamWatchMetaBar">
              <span>{viewerCount} viewers watching</span>
              <span>{streamInfo?.creatorName || "HunShow creator"}</span>
            </div>
          </section>

          <aside className="streamWatchChatCard">
            <div className="streamWatchChatHeader">
              <div>
                <p className="streamWatchEyebrow">Community</p>
                <h2>Live Chat</h2>
              </div>
            </div>

            <div className="streamWatchMessages">
              {messages.length === 0 && (
                <p className="streamWatchEmptyChat">
                  No messages yet. Be the first to chat!
                </p>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${message.id}-${message.timestamp}-${index}`}
                  className="streamWatchMessage"
                >
                  <span>{message.username}</span>
                  <p>{message.message}</p>
                </div>
              ))}
            </div>

            <div className="streamWatchChatInputRow">
              <input
                placeholder={
                  streamEnded ? "Stream ended" : "Send a message..."
                }
                value={newMessage}
                disabled={streamEnded}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSendMessage();
                  }
                }}
              />

              <button
                type="button"
                disabled={streamEnded}
                onClick={handleSendMessage}
              >
                Send
              </button>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}