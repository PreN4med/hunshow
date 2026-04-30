"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE = 50 * 1024 * 1024; 

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
];

const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];

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

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedVideoFile(file: File) {
  const lowerName = file.name.toLowerCase();

  const hasAllowedType =
    !file.type || ALLOWED_VIDEO_TYPES.includes(file.type);

  const hasAllowedExtension = ALLOWED_VIDEO_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension),
  );

  return hasAllowedType || hasAllowedExtension;
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

  function handleVideoChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] || null;

    setError("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!isAllowedVideoFile(selectedFile)) {
      setFile(null);
      event.target.value = "";
      setError("Please upload an MP4, MOV, WebM, or M4V video.");
      return;
    }

    if (selectedFile.size > MAX_VIDEO_SIZE) {
      setFile(null);
      event.target.value = "";
      setError(
        `This video is too large. Please upload a video under ${formatFileSize(
          MAX_VIDEO_SIZE,
        )}.`,
      );
      return;
    }

    setFile(selectedFile);
  }

  function handleThumbnailChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedThumbnail = event.target.files?.[0] || null;

    setError("");

    if (!selectedThumbnail) {
      setThumbnail(null);
      return;
    }

    if (!selectedThumbnail.type.startsWith("image/")) {
      setThumbnail(null);
      event.target.value = "";
      setError("Please upload a valid image file for the thumbnail.");
      return;
    }

    if (selectedThumbnail.size > MAX_THUMBNAIL_SIZE) {
      setThumbnail(null);
      event.target.value = "";
      setError(
        `This thumbnail is too large. Please upload an image under ${formatFileSize(
          MAX_THUMBNAIL_SIZE,
        )}.`,
      );
      return;
    }

    setThumbnail(selectedThumbnail);
  }

  async function handleUpload() {
    if (loading) return;

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!file) {
      setError("Please select a video file.");
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError(
        `This video is too large. Please upload a video under ${formatFileSize(
          MAX_VIDEO_SIZE,
        )}.`,
      );
      return;
    }

    if (!isAllowedVideoFile(file)) {
      setError("Please upload an MP4, MOV, WebM, or M4V video.");
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

      let data: any = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.message || "Upload failed.");
      }

      setSuccess(true);
    } catch (err: any) {
      const message =
        err?.message === "Failed to fetch"
          ? "Upload failed. The video may be too large, your connection may have dropped, or the server took too long to respond."
          : err?.message || "Upload failed.";

      setError(message);
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
                    disabled={loading}
                    onChange={(event) => setTitle(event.target.value)}
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
                    disabled={loading}
                    onChange={(event) => setDescription(event.target.value)}
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
                        {file
                          ? `${formatFileSize(file.size)} selected`
                          : "Select an MP4, MOV, WebM, or M4V video under 500 MB."}
                      </p>
                    </div>

                    <input
                      id="upload-video"
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
                      className="uploadHiddenInput"
                      disabled={loading}
                      onChange={handleVideoChange}
                    />

                    <label
                      htmlFor="upload-video"
                      className="btn btnGhost uploadFileBtn"
                    >
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
                        {thumbnail
                          ? `${formatFileSize(thumbnail.size)} selected`
                          : "Upload a custom thumbnail if you want."}
                      </p>
                    </div>

                    <input
                      id="upload-thumbnail"
                      type="file"
                      accept="image/*"
                      className="uploadHiddenInput"
                      disabled={loading}
                      onChange={handleThumbnailChange}
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

                {loading ? (
                  <p className="uploadHelper">
                    Uploading your video. Please keep this tab open until it
                    finishes.
                  </p>
                ) : null}

                <div className="uploadActions">
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="btn btnGhost uploadBackAction"
                    disabled={loading}
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

                <h2 className="h2 uploadSuccessTitle">
                  Video uploaded successfully
                </h2>

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