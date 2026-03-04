export default function ConfirmPage() {
  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1>Check your email</h1>
      <p style={{ opacity: 0.75 }}>
        We sent a confirmation link to your email. Click it to activate your
        account, then head to login.
      </p>
      <a
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
      </a>
    </main>
  );
}
