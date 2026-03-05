import Link from "next/link";
export default function LoginPage() {
  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1>Login</h1>
      <p style={{ opacity: 0.75 }}>
        (UI only for now — later you can enforce <b>.edu</b> emails)
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          placeholder="Email (.edu)"
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
          Sign in
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
