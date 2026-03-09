import Link from "next/link";

export default function ConfirmPage() {
  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1>Email Verified</h1>
      <p style={{ opacity: 0.75 }}>
        Your account has been confirmed. You can now log in.
      </p>
      <Link
        href="/login"
        style={{
          display: "block",
          marginTop: 16,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ccc",
          textAlign: "center",
          fontWeight: 500,
        }}
      >
        Go to Login
      </Link>
    </main>
  );
}
