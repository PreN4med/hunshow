"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

// Points to your backend — set in .env as NEXT_PUBLIC_API_URL
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

// Shape of each video returned from the backend
interface Video {
  _id: string;
  title: string;
  thumbnailUrl?: string;
  createdAt?: string;
}

export default function LikedVideosPage() {
  // List of liked videos fetched from the backend
  const [videos, setVideos] = useState<Video[]>([]);
  // Controls the loading spinner while we wait for the fetch
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Pull the logged-in user from localStorage (set during login)
    const userData = localStorage.getItem("user");

    // If no user is found, redirect to login — this page requires auth
    if (!userData) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(userData);

    // Fetch all videos this user has liked from the backend
    // Backend route: GET /videos/liked/:userId
    fetch(`${API_URL}/videos/liked/${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        // Guard against unexpected non-array responses
        setVideos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // On network error, show empty state rather than crashing
        setVideos([]);
      })
      .finally(() => {
        // Hide loading spinner regardless of success or failure
        setLoading(false);
      });
  }, [router]);

  return (
    <>
      <Header page="home" />
      <main className="container accountPage">
        <h1 className="h1" style={{ marginBottom: 24 }}>Liked Videos</h1>

        {/* Show spinner while the fetch is in progress */}
        {loading && <p className="accountMuted">Loading...</p>}

        {/* Empty state — shown after load if the user hasn't liked anything */}
        {!loading && videos.length === 0 && (
          <p className="accountMuted">You haven't liked any videos yet.</p>
        )}

        {/* Video grid — reuses the same videoCard styles as the account page */}
        <div className="videoList">
          {videos.map((video) => (
            <article key={video._id} className="videoCard">
              <div className="videoThumb">
                {video.thumbnailUrl ? (
                  // Use the thumbnail if available
                  <img src={video.thumbnailUrl} alt={video.title} />
                ) : (
                  // Fallback play icon if no thumbnail was uploaded
                  <div className="videoThumbFallback"><span>▶</span></div>
                )}
              </div>

              <div className="videoContent">
                <p className="videoTitle">{video.title}</p>
                <div className="videoActions">
                  {/* Links to the watch page for this video */}
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