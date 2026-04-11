"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { mockMovies, Movie } from "@/lib/mockMovies";
import Header from "@/components/Header";

type VideoFromDB = {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  uploadedBy: string;
  creatorName: string;
  createdAt: string;
  thumbnailUrl?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchThumbnailUrl(id: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/videos/${id}/thumbnail`);
    const data = await res.json();
    return data.url || "/thumbnails/default.jpg";
  } catch {
    return "/thumbnails/default.jpg";
  }
}

export default function HomePage() {
  const [dbMovies, setDbMovies] = useState<Movie[]>([]);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch(`${API_URL}/videos`);
        const data: VideoFromDB[] = await res.json();

        const movies = await Promise.all(
          data.map(async (v) => ({
            id: v._id,
            title: v.title,
            creator: v.creatorName,
            year: new Date(v.createdAt).getFullYear(),
            thumbnail: v.thumbnailUrl
              ? await fetchThumbnailUrl(v._id)
              : "/thumbnails/default.jpg",
            videoUrl: v.videoUrl,
            description: v.description || "",
          })),
        );

        setDbMovies(movies);
      } catch (err) {
        console.error("Failed to fetch videos:", err);
      }
    }
    fetchVideos();
  }, []);

  const allMovies = [...mockMovies, ...dbMovies];

  return (
    <>
      <Header page="home" />

      <main className="container">
        <section className="hero">
          <div className="heroCard">
            <h1 className="h1">
              Share student films fast —
              <span style={{ color: "var(--p)" }}> only for .edu creators</span>
              .
            </h1>
            <p className="p">
              A clean Netflix-style space for Hunter/college students to upload,
              browse, and watch student work. Private, simple, and
              collaborative.
            </p>

            <div className="searchRow">
              <input
                className="input"
                placeholder="Search titles, creators, tags..."
              />
              <button className="btn btnPrimary">Search</button>
            </div>
          </div>
        </section>

        <div className="sectionTitle">
          <h2 className="h2">Browse</h2>
          <span className="badge">{allMovies.length} titles</span>
        </div>

        <section className="grid">
          {allMovies.map((m) => (
            <Link key={m.id} href={`/watch/${m.id}`} className="card">
              <div className="thumb" style={{ position: "relative" }}>
                <Image
                  src={m.thumbnail || "/thumbnails/default.jpg"}
                  alt={m.title}
                  fill
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="cardBody">
                <p className="cardTitle">{m.title}</p>
                <p className="cardMeta">
                  {m.creator} {m.year ? `• ${m.year}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </section>

        <footer className="footer">
          © {new Date().getFullYear()} Hun-Show • All rights reserved.
        </footer>
      </main>
    </>
  );
}
