"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="authInlineIcon">
      <path
        d="M5 12H19M19 12L13 6M19 12L13 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");

      const userWithName = {
        ...data.user,
        name:
          data.user.name?.trim() ||
          `${data.user.firstName || ""} ${data.user.lastName || ""}`.trim(),
      };

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("user", JSON.stringify(userWithName));

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header page="home" />

      <main className="container authPage">
        <section className="authShell">
          <div className="authCard">
            <div className="authHeader">
              <p className="authEyebrow">Welcome back</p>
              <h1 className="authTitle">Login</h1>
              <p className="authSubtitle">
                Sign in to upload, like, and manage your student films.
              </p>
            </div>

            <div className="authForm">
              <div className="authField">
                <label className="authLabel" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="accountInput authInput"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="authField">
                <label className="authLabel" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="accountInput authInput"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>

              {error ? <p className="authError">{error}</p> : null}

              <div className="authActions">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="btn btnPrimary authSubmitBtn"
                >
                  <span>{loading ? "Signing in..." : "Sign in"}</span>
                  <ArrowRightIcon />
                </button>

                <Link href="/register" className="btn btnGhost authSecondaryBtn">
                  Register
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="footerInner">
            <div className="footerLinks">
              <Link href="/" className="footerLink">About</Link>
              <Link href="/" className="footerLink">Q&amp;A</Link>
              <Link href="/" className="footerLink">Privacy</Link>
              <Link href="/" className="footerLink">Contact</Link>
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