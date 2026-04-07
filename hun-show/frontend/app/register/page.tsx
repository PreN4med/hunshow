"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");

      // Redirect to a confirmation page
      router.push("/register/confirm");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1>Register</h1>
      <p style={{ opacity: 0.75 }}>
        Create your account to start sharing and watching student films.
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
        />
        <input
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
        />
        <input
          placeholder="Email (.edu)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
        />
        {error && (
          <p style={{ color: "red", fontSize: 13, margin: 0 }}>{error}</p>
        )}
        <button
          onClick={handleRegister}
          disabled={loading}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          {loading ? "Registering..." : "Register"}
        </button>
        <Link
          href="/login"
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ccc",
            textAlign: "center",
            fontWeight: 500,
            cursor: "pointer",
            backgroundColor: "transparent",
            display: "block",
          }}
        >
          Back to Login
        </Link>
      </div>
    </main>
  );
}
