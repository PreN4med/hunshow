"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

interface Video {
  _id: string;
  title: string;
  thumbnailUrl?: string;
  createdAt?: string;
  creatorName?: string;
  creator?: string;
}

function formatPersonName(value = "") {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function makeImageUrl(value?: string | null): string {
  if (!value) return "/thumbnails/default.jpg";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_URL}${value}`;
  }

  return `${API_URL}/${value}`;
}

async function fetchSignedThumbnail(videoId: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/videos/${videoId}/thumbnail`, {
      cache: "no-store",
    });

    const data = await res.json();

    return makeImageUrl(data.url || data.thumbnailUrl);
  } catch {
    return "/thumbnails/default.jpg";
  }
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

export default function LikedVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (!userData) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userData);

    fetch(`${API_URL}/videos/liked/${user.id}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (!Array.isArray(data)) {
          setVideos([]);
          return;
        }

        const enriched = await Promise.all(
          data.map(async (video: Video) => {
            const signedThumbnail = await fetchSignedThumbnail(video._id);

            return {
              ...video,
              thumbnailUrl: signedThumbnail,
              creatorName: formatPersonName(
                video.creatorName || video.creator || "",
              ),
            };
          }),
        );

        setVideos(enriched);
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [router]);

  const filteredVideos = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return videos;

    return videos.filter(
      (video) =>
        video.title.toLowerCase().includes(search) ||
        (video.creatorName || "").toLowerCase().includes(search),
    );
  }, [videos, searchTerm]);

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

                <Link href="/liked" className="sidebarItem sidebarItemActive">
                  <SidebarIcon kind="liked" />
                  <span>Liked Videos</span>
                </Link>

                <Link href="/stream" className="sidebarItem">
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
                      placeholder="Search liked videos..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>

                  <button className="btn btnPrimary searchCompactBtn" type="submit">
                    Search
                  </button>
                </form>
              </div>
            </section>

            <div className="sectionTitle browseHeader">
              <div className="browseHeaderLeft">
                <h2 className="h2 browseTitle">Liked Videos</h2>
              </div>

              <span className="browseCountPill">
                {filteredVideos.length} titles
              </span>
            </div>

            {loading && <p className="p">Loading liked videos...</p>}

            {!loading && filteredVideos.length === 0 && (
              <p className="p">You haven't liked any videos yet.</p>
            )}

            {!loading && filteredVideos.length > 0 && (
              <section className="grid">
                {filteredVideos.map((video) => (
                  <Link
                    key={video._id}
                    href={`/watch/${video._id}`}
                    className="card"
                  >
                    <div className="thumb" style={{ position: "relative" }}>
                      <Image
                        src={video.thumbnailUrl || "/thumbnails/default.jpg"}
                        alt={video.title}
                        fill
                        unoptimized
                        style={{ objectFit: "cover" }}
                      />
                    </div>

                    <div className="cardBody">
                      <p className="cardTitle">{video.title}</p>
                      <p className="cardMeta">
                        {video.creatorName || "Unknown creator"}
                        {video.createdAt
                          ? ` • ${new Date(video.createdAt).toLocaleDateString(
                              "en-US",
                            )}`
                          : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}