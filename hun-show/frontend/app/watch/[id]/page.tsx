"use client";

import { useEffect, useState } from "react";
import { mockMovies, Movie } from "@/lib/mockMovies";
import Link from "next/link";
import CustomVideoPlayer from "@/components/CustomVideoPlayer";
import Header from "@/components/Header";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function WatchPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const startEditing = searchParams.get("edit") === "true";

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [uploadedBy, setUploadedBy] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    let parsedUserId: string | null = null;
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        parsedUserId = parsedUser?.id ?? null;
      } catch {
        parsedUserId = null;
      }
    }
    setUserId(parsedUserId);

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
        const query = parsedUserId ? `?userId=${encodeURIComponent(parsedUserId)}` : '';
        const res = await fetch(`${API_URL}/videos/${id}${query}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();

        // Get signed URL for the video from R2
        const urlRes = await fetch(`${API_URL}/videos/${id}/url`);
        const urlData = await urlRes.json();

        // Get signed URL for the thumbnail from R2
        let thumbnailUrl = "/thumbnails/default.jpg";
        if (data.thumbnailUrl) {
          const thumbRes = await fetch(`${API_URL}/videos/${id}/thumbnail`);
          const thumbData = await thumbRes.json();
          if (thumbData.url) thumbnailUrl = thumbData.url;
        }

        setUploadedBy(data.uploadedBy);

        // Check if the logged in user is the owner
        const userData = localStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          if (user.id === data.uploadedBy) {
            setIsOwner(true);
          }
        }

        const movieFromApi = {
          id: data._id,
          title: data.title,
          description: data.description || "",
          creator: data.creatorName || data.uploadedBy,
          year: new Date(data.createdAt).getFullYear(),
          thumbnail: thumbnailUrl,
          videoUrl: urlData.url,
          likes: data.likes || 0,
          likedByCurrentUser: data.likedByCurrentUser || false,
        };

        setMovie(movieFromApi);
        setEditedTitle(movieFromApi.title);
        setEditedDescription(movieFromApi.description);
        setLiked(Boolean(data.likedByCurrentUser));
        if (startEditing) {
          setIsEditing(true);
        }
      } catch (err) {
        setMovie(null);
      } finally {
        setLoading(false);
      }
    }

    loadMovie();
  }, [id]);

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this video?");
    if (!confirmed) return;

    const userData = localStorage.getItem("user");
    if (!userData) return;
    const user = JSON.parse(userData);

    setDeleting(true);

    try {
      const res = await fetch(`${API_URL}/videos/${id}?userId=${user.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to delete video");
        return;
      }

      // Redirect to home after deletion
      router.push("/");
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      router.push('/login');
      return;
    }

    if (!editedTitle.trim()) {
      alert('Title is required.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/videos/${id}?userId=${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editedTitle.trim(),
          description: editedDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to save changes');
        return;
      }

      setMovie((cur) =>
        cur
          ? {
              ...cur,
              title: data.title,
              description: data.description || "",
            }
          : cur,
      );
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save video details:', err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

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

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              {movie.title}
            </h1>
          </div>

          {/* Only show delete button if the logged in user owns this video */}
          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "1px solid #ff6b6b",
                backgroundColor: "transparent",
                color: "#ff6b6b",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                opacity: deleting ? 0.5 : 1,
              }}
            >
              {deleting ? "Deleting..." : "Delete Video"}
            </button>
          )}
        </div>

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
              Description
            </h2>
            {isOwner && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "1px solid rgba(95,37,159,0.75)",
                backgroundColor: "transparent",
                color: "rgba(95,37,159,0.75)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                opacity: deleting ? 0.5 : 1,
              }}
              >
                Edit Details
              </button>
            )}
          </div>
          {isOwner && isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={editedTitle}
                onChange={(event) => setEditedTitle(event.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #ddd',
                  fontSize: 16,
                }}
                placeholder="Title"
              />
              <textarea
                value={editedDescription}
                onChange={(event) => setEditedDescription(event.target.value)}
                rows={5}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #ddd',
                  fontSize: 15,
                  resize: 'vertical',
                }}
                placeholder="Description"
              />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: 'var(--p)',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTitle(movie.title);
                    setEditedDescription(movie.description);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: '1px solid #ccc',
                    backgroundColor: 'white',
                    color: '#333',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ opacity: 0.85, lineHeight: 1.6, fontSize: 15 }}>
              {movie.description}
            </p>
          )}

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={async () => {
                const storedUser = localStorage.getItem('user');
                const currentUserId = storedUser
                  ? JSON.parse(storedUser)?.id
                  : null;

                if (!currentUserId) {
                  router.push('/login');
                  return;
                }

                try {
                  const res = await fetch(`${API_URL}/videos/${id}/like`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId: currentUserId }),
                  });
                  const result = await res.json();
                  setMovie((cur) =>
                    cur ? { ...cur, likes: result.likes } : cur,
                  );
                  setLiked(result.liked);
                } catch (err) {
                  console.error('Failed to toggle like:', err);
                }
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ccc",
                background: liked ? '#e8f4ff' : 'white',
                cursor: 'pointer',
                zIndex: 10,
                position: 'relative',
                pointerEvents: 'auto',
              }}
            >
              {liked ? '❤️ Liked' : '👍 Like'}
            </button>
            <span style={{ color: '#555' }}>
              {movie?.likes ?? 0} likes
            </span>
          </div>
        </section>
      </main>
    </>
  );
}