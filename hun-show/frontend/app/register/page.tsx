"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="authInlineIcon">
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

function cleanRegisterError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("password")) {
    return "Password must be at least 8 characters and include at least one number, one uppercase letter, one lowercase letter, and one special character.";
  }

  if (lower.includes("email")) {
    return "Please enter a valid email address.";
  }

  if (lower.includes("already") || lower.includes("exists")) {
    return "An account with this email already exists.";
  }

  return message || "Registration failed. Please try again.";
}

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const normalizedFirstName = normalizeName(firstName);
      const normalizedLastName = normalizeName(lastName);

      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");

      router.push("/register/confirm");
      } catch (err: any) {
        setError(cleanRegisterError(err.message || ""));
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
              <p className="authEyebrow">Join HunShow</p>
              <h1 className="authTitle">Register</h1>
              <p className="authSubtitle">
                Create your account to start sharing and watching student films.
              </p>
            </div>

            <div className="authForm">
              <div className="authFieldGrid">
                <div className="authField">
                  <label className="authLabel" htmlFor="register-first-name">
                    First Name
                  </label>
                  <input
                    id="register-first-name"
                    className="accountInput authInput"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <div className="authField">
                  <label className="authLabel" htmlFor="register-last-name">
                    Last Name
                  </label>
                  <input
                    id="register-last-name"
                    className="accountInput authInput"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="authField">
                <label className="authLabel" htmlFor="register-email">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  className="accountInput authInput"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="authField">
                <label className="authLabel" htmlFor="register-password">
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  className="accountInput authInput"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                />
              </div>

              {error ? <p className="authError">{error}</p> : null}

              <div className="authActions">
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={loading}
                  className="btn btnPrimary authSubmitBtn"
                >
                  <span>{loading ? "Registering..." : "Register"}</span>
                </button>

                <Link href="/login" className="btn btnGhost authSecondaryBtn">
                  <ArrowLeftIcon />
                  <span>Back to Login</span>
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