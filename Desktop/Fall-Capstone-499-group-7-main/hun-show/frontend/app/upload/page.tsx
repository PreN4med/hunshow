export default function UploadPage() {
  return (
    <main style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Upload</h1>
      <p style={{ opacity: 0.75 }}>
        MVP idea: title + description + file upload (later connects to backend storage).
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input placeholder="Movie title" style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }} />
        <textarea placeholder="Description" rows={4} style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }} />
        <input type="file" accept="video/*" />
        <button style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}>
          Upload (placeholder)
        </button>
      </div>
    </main>
  );
}