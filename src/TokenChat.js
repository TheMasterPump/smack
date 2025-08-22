import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";

const SOCKET_URL = "/api";
const GIPHY_API_KEY = "KXCpJSf9VS089NhpHPN6SzrRLKRE8n7c";

const logoSVG = (
  <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="18" fill="#fff" opacity="0.08"/>
    <path d="M8 26c2-6 5-12 14-12 4 0 8 2 8 6 0 4-2 7-7 7-4 0-5-3-7-3s-5 2-8 2z" fill="#fff" />
    <circle cx="13" cy="18" r="2" fill="#F5A244"/>
  </svg>
);

// ------ REPORT MODAL -------
function ReportModal({ open, onClose, onReport, message }) {
  const [reason, setReason] = useState("");
  const reasons = [
    "Spam",
    "Scam / Fraud",
    "Harassment",
    "Explicit content",
    "Promotion for other tokens",
    "Other"
  ];

  useEffect(() => {
    if (open) setReason(""); // Reset reason on open
  }, [open]);

  if (!open) return null;
  return (
    <div style={{
      position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.48)", zIndex: 1001,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#23232b", padding: 28, borderRadius: 15, minWidth: 310, maxWidth: 380,
        boxShadow: "0 4px 32px #000a", color: "#fff", position: "relative"
      }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
          Report this message
        </div>
        <div style={{ marginBottom: 8, color: "#fa8a4a", fontWeight: 600 }}>
          "{message?.text || "[image/video]"}"
        </div>
        <div style={{ marginBottom: 10 }}>
          <select
            style={{ width: "100%", padding: 9, borderRadius: 7, fontSize: 15, background: "#19191e", color: "#fff", border: "1px solid #fa8a4a" }}
            value={reason}
            onChange={e => setReason(e.target.value)}
          >
            <option value="">Choose a reason</option>
            {reasons.map(r => <option value={r} key={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 13, marginTop: 12 }}>
          <button
            onClick={() => { if (reason) onReport(reason); }}
            style={{
              background: "#FF3B30", color: "#fff", border: "none", borderRadius: 8, padding: "9px 19px",
              fontWeight: 700, fontSize: 15, cursor: reason ? "pointer" : "not-allowed", opacity: reason ? 1 : 0.7
            }}
            disabled={!reason}
          >Send report</button>
          <button
            onClick={onClose}
            style={{
              background: "#333", color: "#fff", border: "none", borderRadius: 8, padding: "9px 19px",
              fontWeight: 500, fontSize: 15, cursor: "pointer"
            }}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function TokenChat({ slug, user, token }) {
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // REPORT MODAL STATE
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMsg, setReportMsg] = useState(null);

  // For "three dots" menu per message
  const [showMenu, setShowMenu] = useState(null); // index of message menu open

// --- SOCKET IO ---
useEffect(() => {
  const socket = io(SOCKET_URL, { query: { room: slug } });
  socketRef.current = socket;
  socket.on("chat_history", (msgs) => setMessages(msgs));
  socket.on("chat_message", (message) => {
    setMessages(m => [...m, message]);
  });
  socket.on("typing", ({ user: typingUser }) => {
    if (!typingUser || typingUser === user.username) return;
    setTypingUsers(tu => [...new Set([...tu, typingUser])]);
    setTimeout(() => setTypingUsers(tu => tu.filter(u => u !== typingUser)), 1800);
  });

  // 👇 AJOUTE CE BLOC ICI (vers la ligne 115)
  socket.on("banned_message", (data) => {
    alert(data.reason === "Global ban"
      ? "You are globally banned from chat."
      : "You are banned from this token chat."
    );
  });

  return () => socket.disconnect();
}, [slug, user.username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleEmojiClick(emojiData) {
    setMsg(prev => (prev || "") + (emojiData.emoji || ""));
    setShowEmoji(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  async function uploadMedia(file, isVideo = false) {
    setUploading(true);
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: form
    });
    const data = await res.json();
    setUploading(false);
    if (data.imageUrl) {
      socketRef.current.emit("chat_message", {
        room: slug,
        user,
        text: "",
        image: data.imageUrl,
        isGif: false,
        isVideo,
        createdAt: Date.now()
      });
    } else {
      alert(data.error || "Upload failed");
    }
  }

  // ---- GIPHY GIF PICKER ----
  async function searchGifs(q) {
    if (!q) return setGifResults([]);
    const url = `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q)}&api_key=${GIPHY_API_KEY}&limit=16&rating=g`;
    const res = await fetch(url);
    const data = await res.json();
    setGifResults(data.data || []);
  }
  function handleGifSelect(gifUrl) {
    setShowGif(false);
    if (!gifUrl) return;
    socketRef.current.emit("chat_message", {
      room: slug,
      user,
      text: "",
      image: gifUrl,
      isGif: true,
      createdAt: Date.now()
    });
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!msg || msg.replace(/\s/g, "") === "") return;
    socketRef.current.emit("chat_message", {
      room: slug,
      user,
      text: msg.trim(),
      createdAt: Date.now()
    });
    setMsg("");
  }

  function handleInput(e) {
    setMsg(e.target.value);
    socketRef.current.emit("typing", { user: user.username, room: slug });
  }

  // Menu auto-close on click outside
  useEffect(() => {
    function closeMenu(e) {
      if (!e.target.closest('.message-more-btn') && !e.target.closest('.message-more-menu')) setShowMenu(null);
    }
    window.addEventListener("mousedown", closeMenu);
    return () => window.removeEventListener("mousedown", closeMenu);
  }, []);

  useEffect(() => {
    if (!showEmoji && !showGif) return;
    function onClickOutside(e) {
      if (
        !e.target.closest('.emoji-picker-react') &&
        !e.target.closest('.giphy-gif-picker-custom')
      ) {
        setShowEmoji(false);
        setShowGif(false);
      }
    }
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [showEmoji, showGif]);

  // --- HOVER STYLE for the bubble (injected globally)
  useEffect(() => {
    if (document.getElementById("custom-chat-hover")) return;
    const style = document.createElement("style");
    style.id = "custom-chat-hover";
    style.innerHTML = `
      .chat-bubble {
        transition: background 0.17s, box-shadow 0.17s, color 0.17s;
        background: rgba(40, 37, 32, 0.88) !important;
        color: #fff !important;
      }
      .chat-bubble:hover {
        background: rgba(255, 120, 63, 0.27) !important;
        box-shadow: 0 4px 20px #fb402380 !important;
        color: #fff !important;
      }
      .message-more-btn {
        opacity: 0.7;
        transition: opacity 0.18s;
      }
      .chat-bubble:hover .message-more-btn {
        opacity: 1;
      }
      .message-more-menu {
        animation: fade-in-more 0.16s;
      }
      @keyframes fade-in-more {
        from { opacity: 0; transform: translateY(-6px);}
        to   { opacity: 1; transform: none;}
      }
    `;
    document.head.appendChild(style);
  }, []);

  // ---- REPORT SENDER
  function openReport(msgObj) {
    setReportOpen(true);
    setReportMsg(msgObj);
    setShowMenu(null);
  }
  function closeReport() {
    setReportOpen(false);
    setReportMsg(null);
  }
  async function handleSendReport(reason) {
  // SEND to backend!
  try {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: reportMsg?._id || "no_id",
        reason,
        reportedBy: user.username,
        chatRoom: slug,
        reportedUser: reportMsg?.user?.username || "-",
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert("Report sent!");
    } else {
      alert("Error sending report.");
    }
  } catch (e) {
    alert("Network error while sending report!");
  }
  closeReport();
}

  return (
    <div
  style={{
    width: "100%",
    minHeight: "400px", // ← Ajoute un minimum raisonnable (mets la valeur que tu veux)
    // height: "100%",    // (optionnel : tu peux le laisser ou l’enlever)
    display: "flex",
    flexDirection: "column",
    border: "none",
    borderRadius: 0,
    boxSizing: "border-box",
    background: "radial-gradient(ellipse at 80% 0%, #232323 60%, #181920 100%)",
    padding: 0,
    margin: 0,
    // minHeight: 0,     // ← supprime cette ligne !
  }}
>
      {/* REPORT MODAL */}
      <ReportModal
        open={reportOpen}
        onClose={closeReport}
        onReport={handleSendReport}
        message={reportMsg}
      />

      {/* HEADER */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#19191d",
        borderTopLeftRadius: 0, borderTopRightRadius: 0,
        borderBottom: "1px solid #262626",
        padding: "9px 14px 6px 9px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {logoSVG}
          <span style={{
            color: "#FF3B30", fontWeight: 800, fontSize: 16, marginLeft: 6, letterSpacing: 1.2
          }}>{token?.name || "$TOKEN"}</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginLeft: 8, opacity: 0.92 }}>
            Community
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            background: "#FF3B30", color: "#fff", borderRadius: 7, fontWeight: 700, fontSize: 13,
            padding: "3px 8px", display: "flex", alignItems: "center"
          }}>
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#fff", marginRight: 5
            }} /> LIVE
          </span>
          <span style={{ color: "#FF3B30", fontWeight: 700, fontSize: 13 }}>
            146 online
          </span>
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "4px 0 2px 0",
        background: "none",
        minHeight: 0,
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-end", margin: "6px 0"
          }}>
            {m.user?.avatar && (
              <img src={m.user.avatar} alt=""
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  marginRight: 8, border: "1.5px solid #F5A244", background: "#fff", objectFit: "cover"
                }}
              />
            )}
            <div
              className="chat-bubble"
              style={{
                borderRadius: 15,
                padding: "8px 13px",
                minWidth: 60,
                maxWidth: 420,
                boxShadow: "0 1px 8px #1a0f0540",
                position: "relative",
                textShadow: "0 1px 2px #0007",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 2 }}>
                {m.user?.username}
                {m.user?.isAdmin && <span style={{
                  marginLeft: 7, fontSize: 10, background: "#FF3B30", color: "#fff", borderRadius: 6, padding: "2px 7px"
                }}>admin</span>}
                {m.user?.isCreator && <span style={{
                  marginLeft: 7, fontSize: 10, background: "#fff", color: "#F5A244", borderRadius: 6, padding: "2px 7px"
                }}>creator</span>}
              </div>
              {m.image && !m.isVideo && (
                <img
                  src={m.image}
                  alt="uploaded"
                  style={{
                    maxWidth: 150, maxHeight: 120, borderRadius: 8, margin: "4px 0",
                    boxShadow: m.isGif ? "0 0 0 2px #F5A24499" : ""
                  }}
                />
              )}
              {m.isVideo && m.image && (
                <video controls src={m.image} style={{
                  maxWidth: 180, borderRadius: 9, margin: "4px 0"
                }} />
              )}
              {m.text && <div style={{ color: "#fff", wordBreak: "break-word", fontSize: 14 }}>
                {m.text}
              </div>}
              <div style={{ fontSize: 10, color: "#fff", marginTop: 4, textAlign: "right", opacity: 0.76 }}>
                {new Date(m.createdAt).toLocaleTimeString()}
              </div>
              {/* --- "MORE" BUTTON --- */}
              <div style={{ position: "absolute", top: 7, right: 7 }}>
                <button
                  className="message-more-btn"
                  style={{
                    background: "none", border: "none", color: "#fff8", fontSize: 22,
                    cursor: "pointer", padding: 0, margin: 0, borderRadius: 6,
                    outline: "none"
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(showMenu === i ? null : i);
                  }}
                  tabIndex={0}
                  aria-label="More options"
                >⋯</button>
                {/* Contextual menu */}
                {showMenu === i && (
                  <div className="message-more-menu" style={{
                    position: "absolute", top: 28, right: 0, background: "#222", color: "#fff",
                    borderRadius: 9, boxShadow: "0 2px 12px #0008", zIndex: 10, minWidth: 130
                  }}>
                    <div
                      style={{ padding: "12px 18px", cursor: "pointer", fontWeight: 500, color: "#FF3B30" }}
                      onClick={() => openReport(m)}
                    >
                      🚩 Report this message
                    </div>
                    {/* Ajoute ici d’autres actions plus tard (mute, delete, etc.) */}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>

      {typingUsers.length > 0 && (
        <div style={{
          color: "#F5A244", fontSize: 13, marginLeft: 12, marginBottom: 4
        }}>
          {typingUsers.join(", ")} typing...
        </div>
      )}

      {/* INPUT BAR */}
      <form onSubmit={sendMessage}
        style={{
          display: "flex", gap: 7, alignItems: "center", position: "relative",
          background: "#19191d",
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
          padding: "0 0 7px 0"
        }}
      >
        <button
          type="button"
          style={{
            background: "#FF3B30", border: "none", borderRadius: "50%",
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer"
          }}
          disabled={uploading}
          title="Upload image"
          onClick={() => fileInputRef.current.click()}
        >
          <svg width="20" height="20" viewBox="0 0 22 22"><rect x="3" y="5" width="16" height="12" rx="2" stroke="white" strokeWidth="2" fill="none"/><circle cx="8" cy="10" r="2" fill="white"/><path d="M6 15l4-4 4 3" stroke="white" strokeWidth="1.5" fill="none"/></svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => {
            if (e.target.files?.[0]) uploadMedia(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          style={{
            background: "#FF3B30", border: "none", borderRadius: "50%",
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer"
          }}
          title="Upload video"
          onClick={() => videoInputRef.current.click()}
        >
          <svg width="20" height="20" viewBox="0 0 22 22">
            <rect x="3" y="5" width="16" height="12" rx="2" stroke="white" strokeWidth="2" fill="none"/>
            <polygon points="10,10 15,13 10,16" fill="white"/>
          </svg>
        </button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={e => {
            if (e.target.files?.[0]) uploadMedia(e.target.files[0], true);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          style={{
            background: "#FF3B30", border: "none", borderRadius: "50%",
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer"
          }}
          onClick={() => { setShowEmoji(v => !v); setShowGif(false); }}
          tabIndex={-1}
        >
          <svg width="20" height="20" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" stroke="white" strokeWidth="2" fill="none"/><circle cx="8" cy="9" r="1" fill="white"/><circle cx="14" cy="9" r="1" fill="white"/><path d="M8 14c1.333 1 2.667 1 4 0" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>
        </button>
        <button
          type="button"
          style={{
            background: "#FF3B30", border: "none", borderRadius: "50%",
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer"
          }}
          onClick={() => { setShowGif(v => !v); setShowEmoji(false); }}
          tabIndex={-1}
        >
          <svg width="20" height="20" viewBox="0 0 22 22"><rect x="3" y="7" width="16" height="8" rx="2" stroke="white" strokeWidth="2" fill="none"/><text x="7" y="14" fill="white" fontSize="5" fontFamily="Arial">GIF</text></svg>
        </button>
        {showEmoji && (
          <div style={{ position: "absolute", zIndex: 20, bottom: 38, left: 52 }}>
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme="dark"
              width={260}
            />
          </div>
        )}
        {showGif && (
          <div
            className="giphy-gif-picker-custom"
            style={{
              position: "absolute", zIndex: 22, bottom: 38, left: 95,
              background: "#23232b", borderRadius: 10, width: 270, padding: 10
            }}
          >
            <input
              type="text"
              placeholder="Search GIF…"
              value={gifSearch}
              onChange={e => {
                setGifSearch(e.target.value);
                searchGifs(e.target.value);
              }}
              style={{
                width: "100%", marginBottom: 7, borderRadius: 5, padding: 5,
                border: "1px solid #F5A244", fontSize: 13, background: "#191920", color: "#fff"
              }}
              autoFocus
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 120, overflowY: "auto" }}>
              {gifResults.map(gif =>
                <img
                  key={gif.id}
                  src={gif.images.fixed_width_small.url}
                  alt="gif"
                  style={{ width: 68, height: 68, borderRadius: 7, cursor: "pointer", objectFit: "cover" }}
                  onClick={() => handleGifSelect(gif.images.original.url)}
                />
              )}
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          value={msg}
          onChange={handleInput}
          placeholder="Message"
          style={{
            flex: 1, borderRadius: 15, padding: 9, fontSize: 14, border: "1px solid #F5A244", background: "#222",
            color: "#fff", marginLeft: 6
          }}
          maxLength={500}
        />
        <button
          type="submit"
          style={{
            background: "#FF3B30", color: "#fff", border: "none", borderRadius: "8px",
            minWidth: 54, minHeight: 34, fontWeight: 700, fontSize: 15, cursor: "pointer"
          }}
          disabled={uploading}
        >
          {uploading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
