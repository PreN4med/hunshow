"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="uploadInlineIcon"
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

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="uploadInlineIcon"
    >
      <path
        d="M12 16V5M12 5L7.5 9.5M12 5L16.5 9.5M5 19H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function UploadPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleUpload() {
    if (!title.trim()) {
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

      if (!user.id) {
        throw new Error("You must be logged in to upload.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("uploadedBy", user.id);

      if (thumbnail) {
        formData.append("thumbnail", thumbnail);
      }

      const res = await fetch(`${API_URL}/videos/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSuccess(false);
    setTitle("");
    setDescription("");
    setFile(null);
    setThumbnail(null);
    setError("");
  }

  return (
    <>
      <Header page="home" />

      <main className="container uploadPage">
        <section className="uploadShell">
          <div className="uploadCard">
            <div className="uploadHeader">
              <p className="uploadEyebrow">Share your work</p>
              <h1 className="uploadTitle">Upload Video</h1>
              <p className="uploadSubtitle">
                Share your video with the HunShow community.
              </p>
            </div>

            {!success ? (
              <div className="uploadForm">
                <div className="uploadField">
                  <label className="uploadLabel" htmlFor="upload-title">
                    Title
                  </label>
                  <input
                    id="upload-title"
                    className="accountInput uploadInput"
                    placeholder="Enter video title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="uploadField">
                  <label className="uploadLabel" htmlFor="upload-description">
                    Description
                  </label>
                  <textarea
                    id="upload-description"
                    className="accountInput uploadTextarea"
                    placeholder="Enter video description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                  />
                </div>

                <div className="uploadField">
                  <label className="uploadLabel" htmlFor="upload-video">
                    Upload Video
                  </label>

                  <div className="uploadFileCard">
                    <div className="uploadFileInfo">
                      <p className="uploadFileName">
                        {file ? file.name : "No video selected yet"}
                      </p>
                      <p className="uploadHelper">
                        Select a video file to upload.
                      </p>
                    </div>

                    <input
                      id="upload-video"
                      type="file"
                      accept="video/*"
                      className="uploadHiddenInput"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />

                    <label htmlFor="upload-video" className="btn btnGhost uploadFileBtn">
                      Choose Video
                    </label>
                  </div>
                </div>

                <div className="uploadField">
                  <label className="uploadLabel" htmlFor="upload-thumbnail">
                    Thumbnail <span className="uploadOptional">(optional)</span>
                  </label>

                  <div className="uploadFileCard">
                    <div className="uploadFileInfo">
                      <p className="uploadFileName">
                        {thumbnail ? thumbnail.name : "No thumbnail selected"}
                      </p>
                      <p className="uploadHelper">
                        Upload a custom thumbnail if you want.
                      </p>
                    </div>

                    <input
                      id="upload-thumbnail"
                      type="file"
                      accept="image/*"
                      className="uploadHiddenInput"
                      onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
                    />

                    <label
                      htmlFor="upload-thumbnail"
                      className="btn btnGhost uploadFileBtn"
                    >
                      Choose Image
                    </label>
                  </div>
                </div>

                {error ? <p className="uploadError">{error}</p> : null}

                <div className="uploadActions">
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="btn btnGhost uploadBackAction"
                  >
                    <ArrowLeftIcon />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={loading}
                    className="btn btnPrimary uploadSubmitBtn"
                  >
                    <UploadIcon />
                    <span>{loading ? "Uploading..." : "Upload"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="uploadSuccessCard">
                <div className="uploadSuccessIcon">✓</div>
                <h2 className="h2 uploadSuccessTitle">Video uploaded successfully</h2>
                <p className="uploadSubtitle uploadSuccessSub">
                  Your upload is now part of HunShow.
                </p>

                <div className="uploadActions">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btnGhost uploadBackAction"
                  >
                    Upload another
                  </button>

                  <Link href="/" className="btn btnPrimary uploadSubmitBtn">
                    Go to home
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

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