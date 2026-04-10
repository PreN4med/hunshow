"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
}

interface Video {
  _id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  createdAt?: string;
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
      setEditedName(parsedUser.name || "");
      setLoading(false);

      // Fetch user's uploaded videos
      fetchUserVideos(parsedUser.id);
    } catch (e) {
      router.push("/login");
    }
  }, [router]);

  const fetchUserVideos = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/videos/user/${userId}`);
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setVideosLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!user) return;

    // Confirm before deleting
    const confirmed = window.confirm("Are you sure you want to delete this video?");
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

      // Remove the deleted video from state
      setVideos((prev) => prev.filter((v) => v._id !== videoId));
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (loading) {
    return <div className="container" style={{ paddingTop: 60 }}>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header page="account" />

      <main className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h1 className="h1" style={{ marginBottom: 10 }}>Account Settings</h1>
          <p style={{ opacity: 0.7, marginBottom: 40 }}>
            Manage your profile and account preferences
          </p>

          <div
            style={{
              backgroundColor: "var(--card-bg, #f5f5f5)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                Email Address
              </label>
              <p style={{ fontSize: 16, margin: 0, fontWeight: 500 }}>
                {user.email}
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                Display Name
              </label>
              {isEditing ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter your name"
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      fontSize: 14,
                    }}
                  />
                  <button
                    onClick={() => {
                      // TODO: Save name to backend
                      setIsEditing(false);
                    }}
                    className="btn btnPrimary"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditedName(user.name || "");
                      setIsEditing(false);
                    }}
                    className="btn btnGhost"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <p style={{ fontSize: 16, margin: 0, fontWeight: 500 }}>
                    {user.name || "Not set"}
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btnGhost"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {user.createdAt && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                  Member Since
                </label>
                <p style={{ fontSize: 14, margin: 0, opacity: 0.8 }}>
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {/* My Videos Section */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              My Videos
            </h2>

            {videosLoading ? (
              <p style={{ opacity: 0.6 }}>Loading your videos...</p>
            ) : videos.length === 0 ? (
              <p style={{ opacity: 0.6 }}>
                You haven't uploaded any videos yet.{" "}
                <Link href="/upload" style={{ color: "var(--primary, #6c63ff)" }}>
                  Upload one now
                </Link>
              </p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {videos.map((video) => (
                  <div
                    key={video._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      backgroundColor: "var(--card-bg, #f5f5f5)",
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    {/* Thumbnail */}
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        style={{
                          width: 80,
                          height: 50,
                          objectFit: "cover",
                          borderRadius: 6,
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 80,
                          height: 50,
                          backgroundColor: "#ccc",
                          borderRadius: 6,
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* Video info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {video.title}
                      </p>
                      {video.createdAt && (
                        <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
                          {new Date(video.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteVideo(video._id)}
                      disabled={deletingId === video._id}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "1px solid #ff6b6b",
                        backgroundColor: "transparent",
                        color: "#ff6b6b",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        flexShrink: 0,
                        opacity: deletingId === video._id ? 0.5 : 1,
                      }}
                    >
                      {deletingId === video._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleLogout}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                border: "1px solid #ff6b6b",
                backgroundColor: "transparent",
                color: "#ff6b6b",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 107, 107, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <footer className="footer" style={{ marginTop: 80 }}>
          © {new Date().getFullYear()} Hun-Show • All rights reserved.
        </footer>
      </main>
    </>
  );
}