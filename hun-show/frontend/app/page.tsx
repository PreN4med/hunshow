"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Movie } from "@/lib/mockMovies";
import Header from "@/components/Header";

type VideoFromDB = {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  uploadedBy: string;
  creatorName: string;
  createdAt: string;
  thumbnailUrl?: string;
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

export default function HomePage() {
  const [dbMovies, setDbMovies] = useState<Movie[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  async function fetchVideos(query = "") {
    try {
      const url = `${API_URL}/videos${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error(
          "Failed to fetch videos:",
          res.status,
          res.statusText,
          data,
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
        data.map(async (v) => ({
          id: v._id,
          title: v.title,
          creator: v.creatorName,
          year: new Date(v.createdAt).getFullYear(),
          thumbnail: v.thumbnailUrl
            ? await fetchThumbnailUrl(v._id)
            : "/thumbnails/default.jpg",
          videoUrl: v.videoUrl,
          description: v.description || "",
        })),
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

  const allMovies = dbMovies;
  const searchTermLower = searchTerm.trim().toLowerCase();
  const suggestions = searchTermLower
    ? allMovies
        .filter(
          (movie) =>
            movie.title.toLowerCase().includes(searchTermLower) ||
            movie.creator.toLowerCase().includes(searchTermLower),
        )
        .slice(0, 6)
    : [];
  const handleSuggestionSelect = (value: string) => {
    setSearchTerm(value);
    setShowSuggestions(false);
  };

  return (
    <>
      <Header page="home" />

      <main className="container">
        <section className="hero">
          <div className="heroCard">
            <h1 className="h1">
              Share student films fast —
              <span style={{ color: "var(--p)" }}> only for .edu creators</span>
              .
            </h1>
            <p className="p">
              A space for Hunter College students to upload, browse, and watch
              student work. Private, simple, and collaborative.
            </p>

            <form className="searchRow" onSubmit={handleSearch}>
              <div className="autocompleteWrapper">
                <input
                  className="input"
                  placeholder="Search titles, creators, tags..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 100)
                  }
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
                className="btn btnPrimary"
                type="submit"
                disabled={isSearching}
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </form>
          </div>
        </section>

        <div className="sectionTitle">
          <h2 className="h2">Browse</h2>
          <span className="badge">{allMovies.length} titles</span>
        </div>

        {allMovies.length === 0 ? (
          <p className="p">
            No videos match your search. Try a different keyword.
          </p>
        ) : (
          <section className="grid">
            {allMovies.map((m) => (
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
                    {m.creator} {m.year ? `• ${m.year}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </section>
        )}

        <footer className="footer">
          © {new Date().getFullYear()} Hun-Show • All rights reserved.
        </footer>
      </main>
    </>
  );
}
