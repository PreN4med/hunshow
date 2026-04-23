"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Movie } from "@/lib/mockMovies";
import Header from "@/components/Header";

type HomeMovie = Movie & {
  createdAtRaw?: string;
  likes?: number;
  durationLabel?: string;
};

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

async function fetchThumbnailUrl(id: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/videos/${id}/thumbnail`);
    const data = await res.json();
    return data.url || "/thumbnails/default.jpg";
  } catch {
    return "/thumbnails/default.jpg";
  }
}

function formatPersonName(value = "") {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}

function SidebarIcon({
  kind,
}: {
  kind: "home" | "liked" | "streaming" | "qa";
}) {
  if (kind === "home") {
    return (
      <svg
        className="sidebarIcon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 10.5L12 4L20 10.5V19C20 19.5523 19.5523 20 19 20H14V14H10V20H5C4.44772 20 4 19.5523 4 19V10.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (kind === "liked") {
    return (
      <svg
        className="sidebarIcon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 20.5L10.55 19.18C5.4 14.5 2 11.41 2 7.61C2 4.52 4.42 2.1 7.51 2.1C9.24 2.1 10.91 2.91 12 4.19C13.09 2.91 14.76 2.1 16.49 2.1C19.58 2.1 22 4.52 22 7.61C22 11.41 18.6 14.5 13.45 19.19L12 20.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (kind === "streaming") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="sidebarIcon"
      >
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

  if (kind === "qa") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="sidebarIcon"
      >
        <path
          d="M7 18.5L4.5 20V7.5C4.5 5.84 5.84 4.5 7.5 4.5H16.5C18.16 4.5 19.5 5.84 19.5 7.5V12.5C19.5 14.16 18.16 15.5 16.5 15.5H9.5L7 18.5Z"
          fill="currentColor"
          fillOpacity="0.16"
        />
        <path
          d="M7 18.5L4.5 20V7.5C4.5 5.84 5.84 4.5 7.5 4.5H16.5C18.16 4.5 19.5 5.84 19.5 7.5V12.5C19.5 14.16 18.16 15.5 16.5 15.5H9.5L7 18.5Z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
}

function formatDuration(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const totalSeconds = Math.max(0, Math.round(value));

    if (totalSeconds < 1) {
      return "";
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return "";
}

function getVideoDurationLabel(videoUrl?: string): Promise<string> {
  if (!videoUrl) return Promise.resolve("");

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = videoUrl;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;

      if (!Number.isFinite(duration) || duration <= 0) {
        cleanup();
        resolve("");
        return;
      }

      const label = formatDuration(duration);
      cleanup();
      resolve(label);
    };

    video.onerror = () => {
      cleanup();
      resolve("");
    };
  });
}

export default function HomePage() {
  const [dbMovies, setDbMovies] = useState<HomeMovie[]>([]);
  const [featuredMovieId, setFeaturedMovieId] = useState<string | null>(null);
  const [activeBrowseTab, setActiveBrowseTab] = useState<
    "all" | "latest" | "popular"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  async function fetchVideos(query = "") {
    try {
      const url = `${API_URL}/videos${
        query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""
      }`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error(
          "Failed to fetch videos:",
          res.status,
          res.statusText,
          data
        );
        setDbMovies([]);
        return;
      }

      if (!Array.isArray(data)) {
        console.error("Expected video array but got:", data);
        setDbMovies([]);
        return;
      }

      const movies = await Promise.all(
        data.map(async (v) => {
          const durationLabel = formatDuration(v.durationLabel ?? v.duration);

          return {
            id: v._id,
            title: v.title,
            creator: formatPersonName(v.creatorName || ""),
            createdAt: new Date(v.createdAt).toLocaleDateString("en-US"),
            createdAtRaw: v.createdAt,
            likes: v.likes || 0,
            durationLabel,
            thumbnail: v.thumbnailUrl
              ? await fetchThumbnailUrl(v._id)
              : "/thumbnails/default.jpg",
            videoUrl: v.videoUrl,
            description: v.description || "",
          };
        })
      );

      setDbMovies(movies);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
      setDbMovies([]);
    }
  }

  useEffect(() => {
    fetchVideos();
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);
    await fetchVideos(searchTerm);
    setIsSearching(false);
    setShowSuggestions(false);
  }

  const displayedMovies = useMemo(() => {
    const movies = [...dbMovies];

    if (activeBrowseTab === "latest") {
      movies.sort(
        (a, b) =>
          new Date(b.createdAtRaw || 0).getTime() -
          new Date(a.createdAtRaw || 0).getTime()
      );
    }

    if (activeBrowseTab === "popular") {
      movies.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    return movies;
  }, [dbMovies, activeBrowseTab]);

  useEffect(() => {
    if (displayedMovies.length === 0) {
      setFeaturedMovieId(null);
      return;
    }

    setFeaturedMovieId((current) => {
      const stillExists = displayedMovies.some((movie) => movie.id === current);

      if (stillExists) return current;

      const randomMovie =
        displayedMovies[Math.floor(Math.random() * displayedMovies.length)];

      return randomMovie.id;
    });

    const interval = window.setInterval(() => {
      setFeaturedMovieId((current) => {
        const candidates = displayedMovies.filter(
          (movie) => movie.id !== current
        );
        const pool = candidates.length > 0 ? candidates : displayedMovies;
        const randomMovie = pool[Math.floor(Math.random() * pool.length)];
        return randomMovie.id;
      });
    }, 7000);

    return () => window.clearInterval(interval);
  }, [displayedMovies]);

  const searchTermLower = searchTerm.trim().toLowerCase();

  const suggestions = searchTermLower
    ? dbMovies
        .filter(
          (movie) =>
            movie.title.toLowerCase().includes(searchTermLower) ||
            movie.creator.toLowerCase().includes(searchTermLower)
        )
        .slice(0, 6)
    : [];

  const handleSuggestionSelect = (value: string) => {
    setSearchTerm(value);
    setShowSuggestions(false);
  };

  const featuredMovie =
    displayedMovies.find((movie) => movie.id === featuredMovieId) ||
    displayedMovies[0];

  return (
    <>
      <Header page="home" />

      <main className="container homeViewport">
        <div className="homeShell">
          <aside className="homeSidebar">
            <div className="sidebarCard">
              <nav className="sidebarNav" aria-label="Primary">
                <Link href="/" className="sidebarItem sidebarItemActive">
                  <SidebarIcon kind="home" />
                  <span>Home</span>
                </Link>

                <Link href="/liked" className="sidebarItem">
                    <SidebarIcon kind="liked" />
                    <span>Liked Videos</span>
                </Link>

                <Link href="/" className="sidebarItem">
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
                        xmlns="http://www.w3.org/2000/svg"
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
                      placeholder="Search films, creators, tags..."
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
                    />

                    {showSuggestions && suggestions.length > 0 && (
                      <div className="autocompleteList">
                        {suggestions.map((movie) => (
                          <button
                            type="button"
                            key={movie.id}
                            className="autocompleteItem"
                            onMouseDown={() => handleSuggestionSelect(movie.title)}
                          >
                            <span>{movie.title}</span>
                            <span className="autocompleteMeta">
                              by {movie.creator}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn btnPrimary searchCompactBtn"
                    type="submit"
                    disabled={isSearching}
                  >
                    <span className="searchCompactBtnIcon" aria-hidden="true">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
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
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </form>
              </div>
            </section>

            <div className="sectionTitle browseHeader">
              <div className="browseHeaderLeft">
                <h2 className="h2 browseTitle">Browse</h2>

                <div className="browseTabs" role="tablist" aria-label="Browse filters">
                  <button
                    type="button"
                    className={`browseTab ${activeBrowseTab === "all" ? "browseTabActive" : ""}`}
                    onClick={() => setActiveBrowseTab("all")}
                  >
                    All
                  </button>

                  <button
                    type="button"
                    className={`browseTab ${activeBrowseTab === "latest" ? "browseTabActive" : ""}`}
                    onClick={() => setActiveBrowseTab("latest")}
                  >
                    Latest
                  </button>

                  <button
                    type="button"
                    className={`browseTab ${activeBrowseTab === "popular" ? "browseTabActive" : ""}`}
                    onClick={() => setActiveBrowseTab("popular")}
                  >
                    Popular
                  </button>
                </div>
              </div>

              <span className="browseCountPill">{displayedMovies.length} titles</span>
            </div>

            {displayedMovies.length === 0 ? (
              <p className="p">No videos match your search. Try a different keyword.</p>
            ) : (
              <>
                {featuredMovie && (
                  <Link href={`/watch/${featuredMovie.id}`} className="featuredCard">
                    <div className="featuredThumb">
                      <Image
                        src={featuredMovie.thumbnail || "/thumbnails/default.jpg"}
                        alt={featuredMovie.title}
                        fill
                        style={{
                          objectFit: "cover",
                          objectPosition: "center 33%",
                        }}
                      />
                    </div>
                    <div className="featuredContent">
                      <p className="featuredEyebrow">Featured</p>
                      <h3 className="featuredTitle">{featuredMovie.title}</h3>
                      <p className="featuredDescription">
                        {featuredMovie.description?.trim()
                          ? featuredMovie.description
                          : "Watch this student film on Hun-Show."}
                      </p>
                      <p className="featuredMeta">
                        {featuredMovie.creator}
                        {featuredMovie.createdAt ? ` • ${featuredMovie.createdAt}` : ""}
                      </p>

                      <div className="featuredActionRow">
                        <span className="featuredWatchBtn">Watch now</span>
                        {featuredMovie.durationLabel ? (
                          <span className="featuredDurationPill">
                            {featuredMovie.durationLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                )}

                <section className="grid">
                  {displayedMovies.map((m) => (
                    <Link key={m.id} href={`/watch/${m.id}`} className="card">
                      <div className="thumb" style={{ position: "relative" }}>
                        <Image
                          src={m.thumbnail || "/thumbnails/default.jpg"}
                          alt={m.title}
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <div className="cardBody">
                        <p className="cardTitle">{m.title}</p>
                        <p className="cardMeta">
                          {m.creator} {m.createdAt ? `• ${m.createdAt}` : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </section>
              </>
            )}

            <footer className="footer">
              <div className="footerInner">
                <div className="footerLinks">
                  <Link href="/" className="footerLink">About</Link>
                  <Link href="/" className="footerLink">Q&amp;A</Link>
                  <Link href="/" className="footerLink">Privacy</Link>
                  <Link href="/" className="footerLink">Contact</Link>
                </div>

                <div className="footerCopy">
                  © {new Date().getFullYear()} Hun-Show • All rights reserved.
                </div>
              </div>
            </footer>
          </div>
        </div>
      </main>
    </>
  );
}