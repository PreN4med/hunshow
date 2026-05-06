"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
} from "react";
import Link from "next/link";
import Header from "@/components/Header";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

type LiveStream = {
  _id?: string;
  id?: string;
  streamId?: string;
  title?: string;
  username?: string;
  creatorName?: string;
  createdAt?: string;
  startedAt?: string;
  viewerCount?: number;
  viewers?: number;
  status?: string;
  isLive?: boolean;
};

function getStreamId(stream: LiveStream) {
  return stream.streamId || stream._id || stream.id || "";
}

function getStreamKey(stream: LiveStream) {
  return (
    getStreamId(stream) ||
    `${stream.title || "untitled"}-${stream.startedAt || stream.createdAt || ""}`
  );
}

function getStreamCreator(stream: LiveStream) {
  return stream.creatorName || stream.username || "HunShow creator";
}

async function fetchActiveStreams(): Promise<LiveStream[]> {
  const possibleEndpoints = [
    `${API_URL}/stream/active`,
    `${API_URL}/stream/live`,
  ];

  for (const endpoint of possibleEndpoints) {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });

      if (!res.ok) continue;

      const data = await res.json();

      const streams = Array.isArray(data)
        ? data
        : data.streams || data.activeStreams || data.liveStreams || [];

      if (Array.isArray(streams)) {
        return streams.filter((stream: LiveStream) => {
          const status = stream.status?.toLowerCase();

          if (status) {
            return status === "live" || status === "active";
          }

          if (typeof stream.isLive === "boolean") {
            return stream.isLive;
          }

          return false;
        });
      }
    } catch {
      continue;
    }
  }

  return [];
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="streamPlaySvg"
    >
      <path
        d="M9 7.75V16.25C9 16.95 9.76 17.38 10.36 17.02L17.18 12.77C17.74 12.42 17.74 11.58 17.18 11.23L10.36 6.98C9.76 6.62 9 7.05 9 7.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SidebarIcon({
  kind,
}: {
  kind: "home" | "liked" | "streaming" | "qa";
}) {
  if (kind === "home") {
    return (
      <svg className="sidebarIcon" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 10.5L12 4L20 10.5V19C20 19.5523 19.5523 20 19 20H14V14H10V20H5C4.44772 20 4 19.5523 4 19V10.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (kind === "liked") {
    return (
      <svg className="sidebarIcon" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 20.5L10.55 19.18C5.4 14.5 2 11.41 2 7.61C2 4.52 4.42 2.1 7.51 2.1C9.24 2.1 10.91 2.91 12 4.19C13.09 2.91 14.76 2.1 16.49 2.1C19.58 2.1 22 4.52 22 7.61C22 11.41 18.6 14.5 13.45 19.19L12 20.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (kind === "streaming") {
    return (
      <svg className="sidebarIcon" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 15.5A1.5 1.5 0 1 0 12 18.5A1.5 1.5 0 1 0 12 15.5Z"
          fill="currentColor"
        />
        <path
          d="M8.5 12.5C10.43 10.57 13.57 10.57 15.5 12.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M5.5 9.5C9.09 5.91 14.91 5.91 18.5 9.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg className="sidebarIcon" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 18.5L4.5 20V7.5C4.5 5.84 5.84 4.5 7.5 4.5H16.5C18.16 4.5 19.5 5.84 19.5 7.5V12.5C19.5 14.16 18.16 15.5 16.5 15.5H9.5L7 18.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StreamPage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const streamOrderRef = useRef<Map<string, number>>(new Map());

  const loadStreams = useCallback(async () => {
    const activeStreams = await fetchActiveStreams();

    const activeKeys = new Set(
      activeStreams.map((stream) => getStreamKey(stream)),
    );

    for (const key of streamOrderRef.current.keys()) {
      if (!activeKeys.has(key)) {
        streamOrderRef.current.delete(key);
      }
    }

    activeStreams.forEach((stream) => {
      const key = getStreamKey(stream);

      if (!streamOrderRef.current.has(key)) {
        streamOrderRef.current.set(key, Math.random());
      }
    });

    const orderedStreams = [...activeStreams].sort((a, b) => {
      const aOrder = streamOrderRef.current.get(getStreamKey(a)) ?? 0;
      const bOrder = streamOrderRef.current.get(getStreamKey(b)) ?? 0;

      return aOrder - bOrder;
    });

    setStreams(orderedStreams);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStreams();

    const interval = window.setInterval(() => {
      loadStreams();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadStreams]);

  const filteredStreams = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return streams;

    return streams.filter((stream) => {
      const title = (stream.title || "").toLowerCase();
      const creator = getStreamCreator(stream).toLowerCase();

      return title.includes(search) || creator.includes(search);
    });
  }, [streams, searchTerm]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <>
      <Header page="home" />

      <main className="container homeViewport">
        <div className="homeShell">
          <aside className="homeSidebar">
            <div className="sidebarCard">
              <nav className="sidebarNav" aria-label="Primary">
                <Link href="/" className="sidebarItem">
                  <SidebarIcon kind="home" />
                  <span>Home</span>
                </Link>

                <Link href="/liked" className="sidebarItem">
                  <SidebarIcon kind="liked" />
                  <span>Liked Videos</span>
                </Link>

                <Link href="/stream" className="sidebarItem sidebarItemActive">
                  <SidebarIcon kind="streaming" />
                  <span>Streaming</span>
                </Link>

                <Link href="/" className="sidebarItem">
                  <SidebarIcon kind="qa" />
                  <span>Q&amp;A</span>
                </Link>
              </nav>
            </div>
          </aside>

          <div className="homeMain">
            <section className="hero heroCompact">
              <div className="heroSearchBar">
                <form className="searchCompactForm" onSubmit={handleSearch}>
                  <div className="searchCompactInputWrap">
                    <span className="searchCompactIcon" aria-hidden="true">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>

                    <input
                      className="searchCompactInput"
                      placeholder="Search live streams..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>

                  <button
                    className="btn btnPrimary searchCompactBtn"
                    type="submit"
                  >
                    Search
                  </button>
                </form>
              </div>
            </section>

            <div className="sectionTitle browseHeader">
              <div className="browseHeaderLeft">
                <h2 className="h2 browseTitle">Streaming</h2>
                <p className="browseSubtitle">
                  Watch active HunShow live streams from students and creators.
                </p>
              </div>

              <span className="browseCountPill">
                {filteredStreams.length} live
              </span>
            </div>

            {loading && <p className="p">Loading active streams...</p>}

            {!loading && filteredStreams.length === 0 && (
              <div className="streamEmptyState">
                <h3 className="streamEmptyTitle">No one is live right now</h3>
                <p className="p">
                  When someone starts broadcasting, their stream will appear
                  here.
                </p>

                <Link
                  href="/stream/broadcast"
                  className="btn btnPrimary streamEmptyBtn"
                >
                  Start a Live Stream
                </Link>
              </div>
            )}

            {!loading && filteredStreams.length > 0 && (
              <section className="streamSmallGrid">
                {filteredStreams.map((stream) => {
                  const streamId = getStreamId(stream);
                  const streamKey = getStreamKey(stream);

                  return (
                    <Link
                      key={streamKey}
                      href={`/stream/watch/${streamId}`}
                      className="card streamSmallCard"
                    >
                      <div className="thumb streamSmallThumb">
                        <span className="streamLiveBadge">LIVE</span>

                        <div className="streamPreviewCenter streamPreviewCenterSmall">
                          <span className="streamPreviewIcon streamPreviewIconSmall">
                            <PlayIcon />
                          </span>
                        </div>
                      </div>

                      <div className="cardBody streamSmallBody">
                        <p className="cardTitle streamSmallTitle">
                          {stream.title || "Untitled Live Stream"}
                        </p>

                        <p className="cardMeta">
                          {getStreamCreator(stream)}
                          {" • "}
                          {stream.viewerCount ?? stream.viewers ?? 0} watching
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
