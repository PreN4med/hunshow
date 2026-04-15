"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
}

interface Video {
  _id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  createdAt?: string;
}

function formatLongDate(date?: string) {
  if (!date) return "Recently joined";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(date?: string) {
  if (!date) return "No date";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(nameOrEmail: string) {
  const source = nameOrEmail.trim();
  if (!source) return "H";

  if (source.includes("@")) {
    return source[0].toUpperCase();
  }

  const parts = source.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getFullName(user: User) {
  const explicitName = user.name?.trim();
  if (explicitName) return explicitName;

  const first = user.firstName?.trim() || "";
  const last = user.lastName?.trim() || "";
  const full = `${first} ${last}`.trim();
  return full;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setEditedName(getFullName(parsedUser));
      setLoading(false);
      fetchUserVideos(parsedUser.id);
    } catch {
      router.push("/login");
    }
  }, [router]);

  const fetchThumbnailUrl = async (videoId: string) => {
    try {
      const res = await fetch(`${API_URL}/videos/${videoId}/thumbnail`);
      const data = await res.json();
      return data.url || null;
    } catch (err) {
      console.error("Failed to fetch thumbnail URL:", err);
      return null;
    }
  };

  const fetchUserVideos = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/videos/user/${userId}`);
      const data = await res.json();

      const enrichedVideos = await Promise.all(
        data.map(async (video: Video) => {
          if (!video.thumbnailUrl) {
            return video;
          }
          const signedThumbnail = await fetchThumbnailUrl(video._id);
          return {
            ...video,
            thumbnailUrl: signedThumbnail || video.thumbnailUrl,
          };
        }),
      );

      setVideos(enrichedVideos);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setVideosLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!user) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this video?",
    );
    if (!confirmed) return;

    setDeletingId(videoId);

    try {
      const res = await fetch(`${API_URL}/videos/${videoId}?userId=${user.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to delete video");
        return;
      }

      setVideos((prev) => prev.filter((v) => v._id !== videoId));
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveName = () => {
    if (!user) return;

    const nextUser = {
      ...user,
      name: editedName.trim(),
    };

    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setIsEditing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    router.push("/");
  };

  const displayName = useMemo(() => {
    if (!user) return "";
    const fullName = getFullName(user);
    return fullName || "No display name yet";
  }, [user]);

  const getThumbnailSrc = (thumbnailUrl?: string) => {
    if (!thumbnailUrl) return null;
    return thumbnailUrl.startsWith("http") ? thumbnailUrl : null;
  };

  const memberSince = useMemo(() => formatLongDate(user?.createdAt), [user]);

  if (loading) {
    return (
      <>
        <Header page="account" />
        <main className="container accountPage">
          <div className="accountLoadingCard">
            <p className="accountMuted">Loading your account…</p>
          </div>
        </main>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header page="account" />

      <main className="container accountPage">
        <section className="accountHero">
          <div className="accountHeroCard">
            <div className="accountIdentity">
              <div className="accountAvatar">
                {getInitials(user.name || user.email)}
              </div>

              <div className="accountIdentityText">
                <p className="accountEyebrow">Hunter profile</p>
                <h1 className="h1 accountHeroTitle">
                  {user.name?.trim() || "Your account"}
                </h1>
                <p className="accountSubtitle">{user.email}</p>
              </div>
            </div>

            <div className="accountStatGrid">
              <div className="accountStatCard">
                <span className="accountStatLabel">Videos uploaded</span>
                <strong className="accountStatValue">{videos.length}</strong>
              </div>

              <div className="accountStatCard">
                <span className="accountStatLabel">Display name</span>
                <strong className="accountStatValueSmall">
                  {getFullName(user) || "Not set"}
                </strong>
              </div>

              <div className="accountStatCard">
                <span className="accountStatLabel">Member since</span>
                <strong className="accountStatValueSmall">{memberSince}</strong>
              </div>
            </div>
          </div>
        </section>

        <div className="accountGrid">
          <section className="accountMain">
            <div className="accountPanel">
              <div className="accountPanelHeader">
                <div>
                  <h2 className="h2">Profile details</h2>
                  <p className="accountPanelSub">
                    Manage the basics of your account.
                  </p>
                </div>
              </div>

              <div className="accountDetailGrid">
                <div className="accountDetailCard">
                  <p className="accountDetailLabel">Email address</p>
                  <p className="accountDetailValue">{user.email}</p>
                </div>

                <div className="accountDetailCard">
                  <p className="accountDetailLabel">Display name</p>

                  {!isEditing ? (
                    <div className="accountInlineRow">
                      <p className="accountDetailValue">{displayName}</p>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="btn btnGhost accountSmallBtn"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="accountEditWrap">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Enter your display name"
                        className="accountInput"
                      />

                      <div className="accountInlineActions">
                        <button
                          onClick={handleSaveName}
                          className="btn btnPrimary accountSmallBtn"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditedName(getFullName(user));
                            setIsEditing(false);
                          }}
                          className="btn btnGhost accountSmallBtn"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="accountDetailCard">
                  <p className="accountDetailLabel">Member since</p>
                  <p className="accountDetailValue">{memberSince}</p>
                </div>
              </div>
            </div>

            <div className="accountPanel">
              <div className="accountPanelHeader">
                <div>
                  <h2 className="h2">My videos</h2>
                  <p className="accountPanelSub">
                    Review, manage, and remove your uploads.
                  </p>
                </div>

                <Link href="/upload" className="btn btnPrimary accountHeaderBtn">
                  Upload video
                </Link>
              </div>

              {videosLoading ? (
                <div className="accountEmptyState">
                  <p className="accountMuted">Loading your videos…</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="accountEmptyState">
                  <p className="accountEmptyTitle">No uploads yet</p>
                  <p className="accountMuted">
                    Start building your Hun-Show profile by uploading your first
                    video.
                  </p>
                  <Link href="/upload" className="btn btnPrimary">
                    Upload your first video
                  </Link>
                </div>
              ) : (
                <div className="videoList">
                  {videos.map((video) => (
                    <article key={video._id} className="videoCard">
                      <div className="videoThumb">
                        {getThumbnailSrc(video.thumbnailUrl) ? (
                        <img
                        src={getThumbnailSrc(video.thumbnailUrl)!}
                        alt={video.title}
                        onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      />
                      ) : (
                      <div className="videoThumbFallback">
                        <span>▶</span>
                      </div>
                      )}
                    </div>

                      <div className="videoContent">
                        <div>
                          <p className="videoTitle">{video.title}</p>
                          <p className="videoMeta">
                            Uploaded {formatShortDate(video.createdAt)}
                          </p>
                          <p className="videoDescription">
                            {video.description?.trim()
                              ? video.description
                              : "No description added for this upload yet."}
                          </p>
                        </div>

                        <div className="videoActions">
                          <Link href={`/watch/${video._id}`} className="btn btnGhost">
                            Open
                          </Link>

                          <Link
                            href={`/watch/${video._id}?edit=true`}
                            className="btn btnGhost btnEditGhost"
                          >
                            Edit
                          </Link>

                          <button
                            onClick={() => handleDeleteVideo(video._id)}
                            disabled={deletingId === video._id}
                            className="dangerGhostBtn"
                          >
                            {deletingId === video._id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="accountSidebar">
            <div className="accountPanel">
              <h2 className="h2">Quick actions</h2>
              <p className="accountPanelSub">
                Jump to the most common things you’ll want to do.
              </p>

              <div className="accountSidebarActions">
                <Link href="/upload" className="btn btnPrimary accountBlockBtn">
                  Upload new video
                </Link>
                <Link href="/" className="btn btnGhost accountBlockBtn">
                  Back to home
                </Link>
              </div>
            </div>

            <div className="accountPanel accountDangerPanel">
              <h2 className="h2">Account actions</h2>
              <p className="accountPanelSub">
                Logging out will end your current session on this device.
              </p>

              <button onClick={handleLogout} className="dangerSolidBtn">
                Logout
              </button>
            </div>
          </aside>
        </div>

        <footer className="footer">
          © {new Date().getFullYear()} Hun-Show • All rights reserved.
        </footer>
      </main>
    </>
  );
}