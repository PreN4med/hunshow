'use client';

import { mockMovies } from "@/lib/mockMovies";
import Link from "next/link";
import { use } from "react";

type Props = {
  params: Promise<{ id: string }>;
};

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function WatchPage({ params }: Props) {
  const { id } = use(params);
  const movie = mockMovies.find((m) => m.id === id);

  if (!movie) {
    return (
      <main style={{ padding: 24 }}>
        <p>Movie not found.</p>
        <Link href="/">Back</Link>
      </main>
    );
  }

  const isYouTube = movie.videoUrl.includes("youtube.com") || movie.videoUrl.includes("youtu.be");
  const youtubeId = isYouTube ? getYouTubeId(movie.videoUrl) : null;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/" style={{ color: "var(--p)", fontWeight: 500 }}>← Back to Browse</Link>

      <h1 style={{ marginTop: 12, fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em" }}>{movie.title}</h1>
      <p style={{ opacity: 0.75, marginTop: 6, fontSize: 14 }}>
        By {movie.creator} {movie.year ? `• ${movie.year}` : ""}
      </p>

      <div style={{
        marginTop: 24,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(11, 11, 15, 0.12)",
        background: "#000",
        aspectRatio: "16 / 9",
        boxShadow: "0 16px 40px rgba(11, 11, 15, 0.10)"
      }}>
        {isYouTube && youtubeId ? (
          <iframe
            title={movie.title}
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ display: "block" }}
          />
        ) : (
          <video controls width="100%" height="100%" src={movie.videoUrl} style={{ display: "block" }} />
        )}
      </div>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Description</h2>
        <p style={{ opacity: 0.85, lineHeight: 1.6, fontSize: 15 }}>{movie.description}</p>

        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <button style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid rgba(95, 37, 159, 0.2)",
            background: "rgba(95, 37, 159, 0.08)",
            color: "var(--ink)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(95, 37, 159, 0.15)";
            e.currentTarget.style.borderColor = "rgba(95, 37, 159, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(95, 37, 159, 0.08)";
            e.currentTarget.style.borderColor = "rgba(95, 37, 159, 0.2)";
          }}
          >
            ⭐ Rate
          </button>
          <button style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid rgba(95, 37, 159, 0.2)",
            background: "rgba(95, 37, 159, 0.08)",
            color: "var(--ink)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(95, 37, 159, 0.15)";
            e.currentTarget.style.borderColor = "rgba(95, 37, 159, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(95, 37, 159, 0.08)";
            e.currentTarget.style.borderColor = "rgba(95, 37, 159, 0.2)";
          }}
          >
            👥 Watch Party
          </button>
        </div>
      </section>
    </main>
  );
}