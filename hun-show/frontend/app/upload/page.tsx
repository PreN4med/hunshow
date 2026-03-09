"use client";

import Header from "@/components/Header";
import { useState } from "react";

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleUpload() {
    if (!title) {
      setError("Title is required.");
      return;
    }
    if (!file) {
      setError("Please select a video file.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user.id) throw new Error("You must be logged in to upload.");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("genres", ""); // Backend expects this field
      formData.append("uploadedBy", user.id);

      const res = await fetch("http://localhost:5000/videos/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <h1>Upload</h1>
      <p style={{ opacity: 0.75 }}>Upload a video to hunshow.</p>

      {!success ? (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <input
            placeholder="Movie title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <textarea
            placeholder="Description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {error && (
            <p style={{ color: "red", fontSize: 13, margin: 0 }}>{error}</p>
          )}
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <p>Video uploaded successfully!</p>
          <button
            onClick={() => {
              setSuccess(false);
              setTitle("");
              setDescription("");
              setFile(null);
            }}
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            Upload another
          </button>
        </div>
      )}
    </>
  );
}
