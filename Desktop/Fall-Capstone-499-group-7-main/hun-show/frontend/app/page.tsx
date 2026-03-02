import Link from "next/link";
import Image from "next/image";
import { mockMovies } from "@/lib/mockMovies";

export default function HomePage() {
  return (
    <>
      <div className="topbar">
        <div className="container">
          <div className="nav">
            <div className="brand">
              <div className="logoBox" aria-label="Hun-Show logo">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                <path d="M9 7.5v9l8-4.5-8-4.5z" fill="white" />
                </svg>
              </div>
              <div>
                <div className="brandTitle">Hun-Show</div>
                <div className="brandSub">Hunter-only movie sharing</div>
              </div>
            </div>

            <div className="actions">
              <Link className="btn btnGhost" href="/login">Login</Link>
              <Link className="btn btnPrimary" href="/upload">Upload</Link>
            </div>
          </div>
        </div>
      </div>

      <main className="container">
        <section className="hero">
          <div className="heroCard">
            <h1 className="h1">
              Share student films fast —
              <span style={{ color: "var(--p)" }}> only for .edu creators</span>.
            </h1>
            <p className="p">
              A clean Netflix-style space for Hunter/college students to upload, browse,
              and watch student work. Private, simple, and collaborative.
            </p>

            <div className="searchRow">
              <input className="input" placeholder="Search titles, creators, tags..." />
              <button className="btn btnPrimary">Search</button>
              <button className="btn btnGhost">Watch Party</button>
            </div>
          </div>
        </section>

        <div className="sectionTitle">
          <h2 className="h2">Browse</h2>
          <span className="badge">{mockMovies.length} titles</span>
        </div>

        <section className="grid">
          {mockMovies.map((m) => (
            <Link key={m.id} href={`/watch/${m.id}`} className="card">
              <div className="thumb" style={{ position: "relative" }}>
                <Image
                  src={m.thumbnail}
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