"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
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
    } catch (e) {
      router.push("/login");
    }
  }, [router]);

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
