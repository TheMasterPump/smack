// src/ImageField.js
import React, { useState } from "react";
import axios from "axios";

export default function ImageField({ onImageChange }) {
  const [mode, setMode] = useState("ia"); // "ia" ou "upload"
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [img, setImg] = useState(null);

  // IA GENERATION (OpenAI)
  async function generateImage(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // Utilise la clé OpenAI depuis les variables d'environnement
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      const res = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          prompt: prompt,
          n: 1,
          size: "512x512",
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      const url = res.data.data[0].url;
      setImg(url);
      onImageChange(url);
    } catch (e) {
      alert("Erreur génération IA");
    }
    setLoading(false);
  }

  // UPLOAD LOCAL
  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      alert("Image trop lourde (1Mo max)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImg(reader.result);
      onImageChange(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
        <label>
          <input
            type="radio"
            checked={mode === "ia"}
            onChange={() => setMode("ia")}
          />
          Générer avec IA
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "upload"}
            onChange={() => setMode("upload")}
          />
          Upload image
        </label>
      </div>
      {mode === "ia" ? (
        <>
          <input
            placeholder="Décris ton token (ex: doge en pixel art)"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button onClick={generateImage} disabled={loading || !prompt}>
            {loading ? "Génération..." : "Générer"}
          </button>
        </>
      ) : (
        <input type="file" accept="image/*" onChange={handleUpload} />
      )}
      {img && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <img
            src={img}
            alt="preview"
            style={{ maxWidth: 128, maxHeight: 128, borderRadius: 8 }}
          />
        </div>
      )}
    </div>
  );
}
