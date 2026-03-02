import { mockMovies } from "@/lib/mockMovies";
import Link from "next/link";

type Props = {
  params: { id: string };
};

export default function WatchPage({ params }: Props) {
  const movie = mockMovies.find((m) => m.id === params.id);

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
      <Link href="/">← Back</Link>

      <h1 style={{ marginTop: 12 }}>{movie.title}</h1>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        By {movie.creator} {movie.year ? `• ${movie.year}` : ""}
      </p>

      <div style={{ marginTop: 14, borderRadius: 14, overflow: "hidden", border: "1px solid #e5e5e5" }}>
        <video controls width="100%" src={movie.videoUrl} />
      </div>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16 }}>Description</h2>
        <p style={{ opacity: 0.85 }}>{movie.description}</p>

        <div style={{ marginTop: 16 }}>
          <button style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ccc" }}>
            ⭐ Rate (placeholder)
          </button>
        </div>
      </section>
    </main>
  );
}