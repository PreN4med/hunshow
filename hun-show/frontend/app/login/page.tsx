"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
      const res = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong");

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1>Login</h1>
      <p style={{ opacity: 0.75 }}>
        (UI only for now — later you can enforce <b>.edu</b> emails)
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
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
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
        />
        {error && (
          <p style={{ color: "red", fontSize: 13, margin: 0 }}>{error}</p>
        )}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <Link
          href="/register"
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
          Register
        </Link>
      </div>
    </main>
  );
}
