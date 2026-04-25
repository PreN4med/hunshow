"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

interface Video {
  _id: string;
  title: string;
  thumbnailUrl?: string;
  createdAt?: string;
}

// Fetches a signed thumbnail URL from the backend
async function fetchSignedThumbnail(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/videos/${videoId}/thumbnail`);
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

export default function LikedVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
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
        if (!Array.isArray(data)) { setVideos([]); return; }

        // Fetch signed thumbnail URLs for each video
        const enriched = await Promise.all(
          data.map(async (video: Video) => {
            if (!video.thumbnailUrl) return video;
            const signedUrl = await fetchSignedThumbnail(video._id);
            return { ...video, thumbnailUrl: signedUrl || undefined };
          })
        );

        setVideos(enriched);
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <>
      <Header page="home" />
      <main className="container accountPage">
        <h1 className="h1" style={{ marginBottom: 24 }}>Liked Videos</h1>

        {loading && <p className="accountMuted">Loading...</p>}

        {!loading && videos.length === 0 && (
          <p className="accountMuted">You haven't liked any videos yet.</p>
        )}

        <div className="videoList">
          {videos.map((video) => (
            <article key={video._id} className="videoCard">
              <div className="videoThumb">
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title} />
                ) : (
                  <div className="videoThumbFallback"><span>▶</span></div>
                )}
              </div>
              <div className="videoContent">
                <p className="videoTitle">{video.title}</p>
                <div className="videoActions">
                  <Link href={`/watch/${video._id}`} className="btn btnGhost">
                    Watch
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}