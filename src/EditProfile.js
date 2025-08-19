import React, { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/1077/1077114.png";

export default function EditProfile({ user, currentWallet, onSave, onCancel }) {
  console.log("EditProfile: user.address =", user.address, "currentWallet =", currentWallet);

  const [form, setForm] = useState({
    avatar: user.avatar || "",
    bio: user.bio || "",
    twitter: user.twitter || "",
    handle: user.handle || "",
  });

  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  function isValidTwitterUrl(url) {
    if (!url) return true;
    try {
      const u = new URL(url);
      return u.protocol === "https:" && u.hostname === "twitter.com";
    } catch {
      return false;
    }
  }

  const validate = () => {
    if (form.handle.length > 14) {
      setError("Display Name must be 14 characters or less.");
      return false;
    }
    if (form.bio.length > 140) {
      setError("Bio must be 140 characters or less.");
      return false;
    }
    if (form.twitter && !isValidTwitterUrl(form.twitter)) {
      setError("Twitter link must start with https://twitter.com/...");
      return false;
    }
    return true;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed (jpg, png, gif, etc).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Image too large (max 3 MB).");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const uid = user.uid || user.handle || user.address || "default";
      const storageRef = ref(storage, `avatars/${uid}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm((f) => ({ ...f, avatar: url }));
    } catch (err) {
      setError("Failed to upload image.");
    }
    setUploading(false);
  };

  // *** C'est ICI le check le plus important ! ***
  const isOwner = currentWallet && user.address && (currentWallet === user.address);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    // Vérification du wallet AVANT tout
    if (!isOwner) {
      setError("You can only modify your own profile (wallet mismatch).");
      return;
    }
    if (!validate()) return;
    onSave(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#191b23",
        borderRadius: 20,
        maxWidth: 430,
        margin: "50px auto",
        padding: 32,
        boxShadow: "0 0 48px 10px #fb402377, 0 0 4px #fff1",
        border: "2.5px solid #fb4023bb",
        color: "#fff",
      }}
    >
      <h2
        style={{
          marginBottom: 25,
          fontWeight: 900,
          fontSize: 25,
          color: "#fb4023",
          textAlign: "center",
          textShadow: "0 3px 15px #fb402388,0 2px 12px #fff1",
          letterSpacing: 1.1,
        }}
      >
        Edit your profile
      </h2>

      {error && <div style={{ color: "#fb4023", marginBottom: 16 }}>{error}</div>}
      {!isOwner && (
        <div style={{ color: "#fb4023", fontWeight: 700, marginBottom: 18 }}>
          You can only edit your own profile.
        </div>
      )}

      {/* Avatar Upload */}
      <label style={labelStyle}>Avatar</label>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{
          ...inputStyle,
          padding: 0,
          background: "none",
          border: "none",
          color: "#fff",
          marginBottom: 18,
        }}
        disabled={!isOwner}
      />
      {uploading && (
        <div style={{ color: "#ffcc32", fontSize: 13, marginBottom: 8 }}>
          Uploading...
        </div>
      )}
      <img
        src={form.avatar && form.avatar.startsWith("http") ? form.avatar : defaultAvatar}
        alt="avatar preview"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "block",
          margin: "0 auto 18px auto",
          boxShadow: "0 0 12px #fb402388",
          border: "2px solid #fb4023",
          objectFit: "cover",
        }}
      />

      <label style={labelStyle}>
        Display Name{" "}
        <span style={{ color: "#fb4023", fontWeight: 400, fontSize: 12 }}>
          (max 14 chars)
        </span>
      </label>
      <input
        type="text"
        value={form.handle}
        onChange={(e) => setForm({ ...form, handle: e.target.value })}
        placeholder="Your display name"
        style={inputStyle}
        maxLength={14}
        disabled={!isOwner}
      />
      <div style={{ fontSize: 12, color: "#999", marginBottom: 18 }}>
        {form.handle.length}/14
      </div>

      <label style={labelStyle}>
        Bio{" "}
        <span style={{ color: "#fb4023", fontWeight: 400, fontSize: 12 }}>
          (max 140 chars)
        </span>
      </label>
      <textarea
        value={form.bio}
        maxLength={140}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
        style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
        placeholder="Tell us about yourself"
        disabled={!isOwner}
      />
      <div style={{ fontSize: 12, color: "#999", marginBottom: 18 }}>
        {form.bio.length}/140
      </div>

      <label style={labelStyle}>Twitter URL</label>
      <input
        type="text"
        value={form.twitter}
        onChange={(e) => setForm({ ...form, twitter: e.target.value })}
        placeholder="https://twitter.com/yourhandle"
        style={inputStyle}
        disabled={!isOwner}
      />

      <div
        style={{ marginTop: 30, display: "flex", gap: 16, justifyContent: "center" }}
      >
        <button
          type="submit"
          disabled={!isOwner}
          style={{
            background: isOwner
              ? "linear-gradient(90deg, #ffcc32 0%, #fb4023 100%)"
              : "#555",
            color: isOwner ? "#191b23" : "#aaa",
            fontWeight: 800,
            border: 0,
            borderRadius: 16,
            padding: "10px 36px",
            fontSize: 16,
            cursor: isOwner ? "pointer" : "not-allowed",
            boxShadow: "0 2px 12px #fb402344",
            letterSpacing: 1,
            transition: "all .18s",
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "#23263a",
            color: "#fff",
            border: 0,
            borderRadius: 16,
            padding: "10px 24px",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 1px 6px #191b2344",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  margin: "8px 0 20px 0",
  borderRadius: 12,
  border: "1.5px solid #23263a",
  background: "#22242e",
  color: "#fff",
  fontSize: 16,
  outline: "none",
  fontWeight: 500,
};

const labelStyle = {
  color: "#ffcc32",
  fontWeight: 700,
  marginBottom: 4,
  marginTop: 2,
  display: "block",
  letterSpacing: 0.5,
};
