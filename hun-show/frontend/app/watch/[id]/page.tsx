"use client";

import { useEffect, useState } from "react";
import { mockMovies, Movie } from "@/lib/mockMovies";
import Link from "next/link";
import CustomVideoPlayer from "@/components/CustomVideoPlayer";
import Header from "@/components/Header";
import { useParams } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default function WatchPage() {
  const params = useParams();
  const id = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovie() {
      // This is for hardcoded movies, can remove if we remove the mock movies
      const mock = mockMovies.find((m) => m.id === id);
      if (mock) {
        setMovie(mock);
        setLoading(false);
        return;
      }

      // Otherwise fetch from backend
      try {
        // Get video metadata from MongoDB
        const res = await fetch(`http://localhost:5000/videos/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();

        // Get signed URL for the video from R2
        const urlRes = await fetch(`http://localhost:5000/videos/${id}/url`);
        const urlData = await urlRes.json();

        setMovie({
          id: data._id,
          title: data.title,
          description: data.description || "",
          creator: data.uploadedBy,
          year: new Date(data.createdAt).getFullYear(),
          thumbnail: "/thumbnails/default.jpg",
          videoUrl: urlData.url,
        });
      } catch (err) {
        setMovie(null);
      } finally {
        setLoading(false);
      }
    }

    loadMovie();
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <main style={{ padding: 24 }}>
          <p>Loading...</p>
        </main>
      </>
    );
  }

  if (!movie) {
    return (
      <>
        <Header />
        <main style={{ padding: 24 }}>
          <p>Movie not found.</p>
          <Link href="/">Back</Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
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
    </>
  );
}
