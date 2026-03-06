"use client";

import { mockMovies } from "@/lib/mockMovies";
import Link from "next/link";
import CustomVideoPlayer from "@/components/CustomVideoPlayer";
type Props = {
  params: Promise<{ id: string }>;
};

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

export default async function WatchPage({ params }: Props) {
  const { id } = await params;
  const movie = mockMovies.find((m) => m.id === id);

  if (!movie) {
    return (
      <main style={{ padding: 24 }}>
        <p>Movie not found.</p>
        <Link href="/">Back</Link>
      </main>
    );
  }
  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/" style={{ color: "var(--p)", fontWeight: 500 }}>
        ← Back to Browse
      </Link>

      <h1
        style={{
          marginTop: 12,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
      >
        {movie.title}
      </h1>
      <p style={{ opacity: 0.75, marginTop: 6, fontSize: 14 }}>
        By {movie.creator} {movie.year ? `• ${movie.year}` : ""}
      </p>

      <div
        style={{
          marginTop: 14,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid #e5e5e5",
        }}
      >
        <CustomVideoPlayer
          src={movie.videoUrl}
          poster={movie.thumbnail}
          title={movie.title}
        />
      </div>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          Description
        </h2>
        <p style={{ opacity: 0.85, lineHeight: 1.6, fontSize: 15 }}>
          {movie.description}
        </p>

        <div style={{ marginTop: 16 }}>
          <button
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
            }}
          >
            ⭐ Rate (placeholder)
          </button>
        </div>
      </section>
    </main>
  );
}
