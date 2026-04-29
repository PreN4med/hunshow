"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CustomVideoPlayer from "@/components/CustomVideoPlayer";
import Header from "@/components/Header";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

type WatchMovie = {
  id: string;
  title: string;
  description: string;
  creator: string;
  createdAt: string;
  thumbnail: string;
  videoUrl: string;
  likes: number;
  likedByCurrentUser?: boolean;
};

type SidebarMovie = {
  id: string;
  title: string;
  creator: string;
  createdAt: string;
  thumbnail: string;
};

type Comment = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

async function fetchThumbnailUrl(id: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/videos/${id}/thumbnail`);
    const data = await res.json();
    return data.url || "/thumbnails/default.jpg";
  } catch {
    return "/thumbnails/default.jpg";
  }
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="watchInlineIcon"
    >
      <path
        d="M19 12H5M5 12L11 6M5 12L11 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
      className="watchInlineIcon"
    >
      <path
        d="M12 20.5L10.55 19.18C5.4 14.5 2 11.41 2 7.61C2 4.52 4.42 2.1 7.51 2.1C9.24 2.1 10.91 2.91 12 4.19C13.09 2.91 14.76 2.1 16.49 2.1C19.58 2.1 22 4.52 22 7.61C22 11.41 18.6 14.5 13.45 19.19L12 20.5Z"
        stroke={filled ? "none" : "currentColor"}
        strokeWidth="1.8"
      />
    </svg>
  );
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

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="watchInlineIcon"
    >
      <path
        d="M12 3V15M12 15L7.5 10.5M12 15L16.5 10.5M5 19H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WatchPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const startEditing = searchParams.get("edit") === "true";

  const [movie, setMovie] = useState<WatchMovie | null>(null);
  const [relatedMovies, setRelatedMovies] = useState<SidebarMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

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

    async function loadPage() {
      try {
        const query = parsedUserId
          ? `?userId=${encodeURIComponent(parsedUserId)}`
          : "";

        const res = await fetch(`${API_URL}/videos/${id}${query}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();

        const urlRes = await fetch(`${API_URL}/videos/${id}/url`);
        const urlData = await urlRes.json();

        const currentCreator = formatPersonName(
          data.creatorName || data.uploadedBy || "Unknown creator",
        );
        let thumbnailUrl = "/thumbnails/default.jpg";
        if (data.thumbnailUrl) {
          thumbnailUrl = await fetchThumbnailUrl(data._id);
        }

        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.id === data.uploadedBy) {
            setIsOwner(true);
          }
        }

        const movieFromApi: WatchMovie = {
          id: data._id,
          title: data.title,
          description: data.description || "",
          creator: currentCreator,
          createdAt: new Date(data.createdAt).toLocaleDateString("en-US"),
          thumbnail: thumbnailUrl,
          videoUrl: urlData.url,
          likes: data.likes || 0,
          likedByCurrentUser: Boolean(data.likedByCurrentUser),
        };

        setMovie(movieFromApi);
        setEditedTitle(movieFromApi.title);
        setEditedDescription(movieFromApi.description);
        setLiked(Boolean(data.likedByCurrentUser));

        // Fetch comments for this video
        await fetchComments(data._id);

        if (startEditing) {
          setIsEditing(true);
        }

        const allVideosRes = await fetch(`${API_URL}/videos`);
        const allVideosData = await allVideosRes.json();

        if (Array.isArray(allVideosData)) {
          const candidates = allVideosData.filter(
            (video) => video._id !== data._id,
          );

          const enriched = await Promise.all(
            candidates.map(async (video) => ({
              id: video._id,
              title: video.title,
              creator: formatPersonName(
                video.creatorName || video.uploadedBy || "Unknown creator",
              ),
              createdAt: new Date(video.createdAt).toLocaleDateString("en-US"),
              thumbnail: video.thumbnailUrl
                ? await fetchThumbnailUrl(video._id)
                : "/thumbnails/default.jpg",
            })),
          );

          const sameCreator = shuffleArray(
            enriched.filter((video) => video.creator === currentCreator),
          );

          const others = shuffleArray(
            enriched.filter((video) => video.creator !== currentCreator),
          );

          setRelatedMovies([...sameCreator, ...others].slice(0, 4));
        }
      } catch {
        setMovie(null);
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [id, startEditing]);

  const likeLabel = useMemo(() => (liked ? "Liked" : "Like"), [liked]);

  const handleDownload = () => {
    if (!movie?.videoUrl) return;

    const link = document.createElement("a");
    link.href = movie.videoUrl;
    link.download = `${movie.title || "video"}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this video?",
    );
    if (!confirmed) return;

    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    const parsedUser = JSON.parse(storedUser);

    setDeleting(true);

    try {
      const res = await fetch(
        `${API_URL}/videos/${id}?userId=${parsedUser.id}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to delete video");
        return;
      }

      router.push("/");
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      router.push("/login");
      return;
    }

    if (!editedTitle.trim()) {
      alert("Title is required.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `${API_URL}/videos/${id}?userId=${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editedTitle.trim(),
            description: editedDescription.trim(),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to save changes");
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
    } catch {
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLike = async () => {
    const storedUser = localStorage.getItem("user");
    const currentUserId = storedUser ? JSON.parse(storedUser)?.id : null;

    if (!currentUserId) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/videos/${id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: currentUserId }),
      });

      const result = await res.json();

      setMovie((cur) => (cur ? { ...cur, likes: result.likes } : cur));
      setLiked(Boolean(result.liked));
    } catch {
      console.error("Failed to toggle like");
    }
  };

  const fetchComments = async (videoId: string) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`${API_URL}/comments/video/${videoId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async () => {
    const storedUser = localStorage.getItem("user");
    const currentUserId = storedUser ? JSON.parse(storedUser)?.id : null;

    if (!currentUserId) {
      router.push("/login");
      return;
    }

    if (!newCommentText.trim()) {
      alert("Please enter a comment");
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          videoId: id,
          content: newCommentText.trim(),
        }),
      });

      if (res.ok) {
        setNewCommentText("");
        await fetchComments(id);
      } else {
        alert("Failed to add comment");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      alert("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const storedUser = localStorage.getItem("user");
    const currentUserId = storedUser ? JSON.parse(storedUser)?.id : null;

    if (!currentUserId) return;

    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;

    try {
      const res = await fetch(
        `${API_URL}/comments/${commentId}/${currentUserId}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        await fetchComments(id);
      } else {
        alert("Failed to delete comment");
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert("Failed to delete comment");
    }
  };

  if (loading) {
    return (
      <>
        <Header page="home" />
        <main className="container watchPage">
          <div className="watchLoadingCard">
            <p className="accountMuted">Loading video…</p>
          </div>

          <footer className="footer">
            <div className="footerInner">
              <div className="footerLinks">
                <Link href="/" className="footerLink">
                  About
                </Link>
                <Link href="/" className="footerLink">
                  Q&amp;A
                </Link>
                <Link href="/" className="footerLink">
                  Privacy
                </Link>
                <Link href="/" className="footerLink">
                  Contact
                </Link>
              </div>

              <div className="footerCopy">
                © {new Date().getFullYear()} Hun-Show • All rights reserved.
              </div>
            </div>
          </footer>
        </main>
      </>
    );
  }

  if (!movie) {
    return (
      <>
        <Header page="home" />
        <main className="container watchPage">
          <div className="watchLoadingCard">
            <p className="accountMuted">Movie not found.</p>
            <Link href="/" className="watchBackBtn">
              <ArrowLeftIcon />
              <span>Back to Browse</span>
            </Link>
          </div>

          <footer className="footer">
            <div className="footerInner">
              <div className="footerLinks">
                <Link href="/" className="footerLink">
                  About
                </Link>
                <Link href="/" className="footerLink">
                  Q&amp;A
                </Link>
                <Link href="/" className="footerLink">
                  Privacy
                </Link>
                <Link href="/" className="footerLink">
                  Contact
                </Link>
              </div>

              <div className="footerCopy">
                © {new Date().getFullYear()} Hun-Show • All rights reserved.
              </div>
            </div>
          </footer>
        </main>
      </>
    );
  }

  return (
    <>
      <Header page="home" />

      <main className="container watchPage">
        <div className="watchLayout">
          <section className="watchMain">
            <div className="watchTopRow">
              <Link href="/" className="watchBackBtn">
                <ArrowLeftIcon />
                <span>Back to Browse</span>
              </Link>
            </div>

            <div className="watchTitleBlock">
              <h1 className="watchTitle">{movie.title}</h1>
              <p className="watchMeta">
                By {movie.creator}
                {movie.createdAt ? ` • ${movie.createdAt}` : ""}
              </p>
            </div>

            <div className="watchPlayerShell">
              <CustomVideoPlayer
                src={movie.videoUrl}
                poster={movie.thumbnail}
                title={movie.title}
              />
            </div>

            <div className="watchActionBar">
              <div className="watchLikeWrap">
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={`watchLikeBtn ${liked ? "watchLikeBtnActive" : ""}`}
                >
                  <HeartIcon filled={liked} />
                  <span>{likeLabel}</span>
                </button>

                <span className="watchLikesCount">
                  {movie.likes ?? 0} {movie.likes === 1 ? "Like" : "Likes"}
                </span>
              </div>

              <div className="watchOwnerActions">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="watchDownloadBtn"
                >
                  <DownloadIcon />
                  <span>Download</span>
                </button>

                {isOwner && !isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="watchEditBtn"
                    >
                      Edit Details
                    </button>

                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="watchDeleteBtn"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <section className="watchDescriptionCard">
              <div className="watchSectionHeader">
                <h2 className="h2">Description</h2>
              </div>

              {isOwner && isEditing ? (
                <div className="watchEditForm">
                  <input
                    value={editedTitle}
                    onChange={(event) => setEditedTitle(event.target.value)}
                    className="accountInput"
                    placeholder="Title"
                  />

                  <textarea
                    value={editedDescription}
                    onChange={(event) =>
                      setEditedDescription(event.target.value)
                    }
                    rows={5}
                    className="accountInput watchTextarea"
                    placeholder="Description"
                  />

                  <div className="watchEditActions">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="btn btnPrimary"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedTitle(movie.title);
                        setEditedDescription(movie.description);
                      }}
                      className="btn btnGhost"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="watchDescriptionText">
                  {movie.description?.trim()
                    ? movie.description
                    : "No description added for this video yet."}
                </p>
              )}
            </section>

            <section className="watchCommentsCard">
              <div className="watchSectionHeader">
                <h2 className="h2">Comments</h2>
              </div>

              <div className="watchCommentForm">
                <textarea
                  value={newCommentText}
                  onChange={(event) => setNewCommentText(event.target.value)}
                  rows={3}
                  className="accountInput watchTextarea"
                  placeholder="Add a comment..."
                />

                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={submittingComment || !newCommentText.trim()}
                  className="btn btnPrimary"
                >
                  {submittingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>

              <div className="watchCommentsList">
                {commentsLoading ? (
                  <p className="accountMuted">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="accountMuted">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="watchCommentItem">
                      <div className="watchCommentHeader">
                        <span className="watchCommentAuthor">
                          {comment.user?.name || "Anonymous"}
                        </span>
                        <span className="watchCommentDate">
                          {new Date(comment.created_at).toLocaleDateString(
                            "en-US",
                          )}
                        </span>
                      </div>

                      <p className="watchCommentText">{comment.content}</p>

                      {userId === comment.user_id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="watchCommentDeleteBtn"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>

          <aside className="watchSidebar">
            <div className="watchSidebarCard">
              <h2 className="watchSidebarTitle">More Videos</h2>

              <div className="watchSidebarList">
                {relatedMovies.slice(0, 4).map((related) => (
                  <Link
                    key={related.id}
                    href={`/watch/${related.id}`}
                    className="watchSidebarItem"
                  >
                    <div className="watchSidebarThumb">
                      <Image
                        src={related.thumbnail || "/thumbnails/default.jpg"}
                        alt={related.title}
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    </div>

                    <div className="watchSidebarBody">
                      <p className="watchSidebarItemTitle">{related.title}</p>
                      <p className="watchSidebarMeta">
                        {related.creator}
                        {related.createdAt ? ` • ${related.createdAt}` : ""}
                      </p>
                    </div>
                  </Link>
                ))}

                {relatedMovies.length === 0 && (
                  <p className="accountMuted">No other uploads yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        <footer className="footer">
          <div className="footerInner">
            <div className="footerLinks">
              <Link href="/" className="footerLink">
                About
              </Link>
              <Link href="/" className="footerLink">
                Q&amp;A
              </Link>
              <Link href="/" className="footerLink">
                Privacy
              </Link>
              <Link href="/" className="footerLink">
                Contact
              </Link>
            </div>

            <div className="footerCopy">
              © {new Date().getFullYear()} Hun-Show • All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
