import Link from "next/link";
export default function RegisterPage() {
  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1>Register</h1>
      <p style={{ opacity: 0.75 }}>
        Create your account to start sharing and watching student films.
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          placeholder="First Name"
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
        />
        <input
          placeholder="Last Name"
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
        />
        <input
          placeholder="Email (.edu)"
          type="email"
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
        />
        <input
          placeholder="Password"
          type="password"
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
        />
        <button
          style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
        >
          Register
        </button>
        <Link href="/login" style={{
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ccc",
          textAlign: "center",
          fontWeight: 500,
          cursor: "pointer",
          backgroundColor: "transparent",
          display: "block"
        }}>
          Back to Login
        </Link>
      </div>
    </main>
  );
}
