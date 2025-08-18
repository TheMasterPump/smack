import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, doc, updateDoc, arrayUnion } from "firebase/firestore";
import "./Leaderboard.css";

// Pour la couleur des badges
const badgeColors = {
  Degen: "#13ff98",
  OG: "#ffcc32",
  Legend: "#fb4023",
};

export default function Leaderboard({ connectedWallet }) {
  const [users, setUsers] = useState([]);
  const [voted, setVoted] = useState({}); // { userId: true }
  const [message, setMessage] = useState(null); // Message d'info

  useEffect(() => {
    // Ecoute en live la collection users (leaderboard)
    const q = collection(db, "users");
    const unsub = onSnapshot(q, (snap) => {
      const usersList = [];
      snap.forEach((docu) => {
        const data = docu.data();
        usersList.push({
          id: docu.id,
          handle: data.handle || data.address?.slice(0, 8) || docu.id,
          avatar: data.avatar || "",
          xp: data.xp || 0,
          tokens: data.tokensCreated || 0,
          followers: data.followers?.length || 0,
          rankType: data.rankType || "Degen",
          votes: data.votes || [],
        });
      });
      // Classement par XP DESC
      usersList.sort((a, b) => b.xp - a.xp);
      setUsers(usersList);
    });
    return () => unsub();
  }, []);

  // Mise à jour des votes déjà faits par ce wallet (pour désactiver le bouton)
  useEffect(() => {
    if (!connectedWallet) return;
    const votedMap = {};
    users.forEach((u) => {
      if (u.votes && u.votes.includes(connectedWallet)) {
        votedMap[u.id] = true;
      }
    });
    setVoted(votedMap);
  }, [connectedWallet, users]);

  async function handleVote(userId) {
    if (!connectedWallet) {
      setMessage("Connect your wallet first!");
      return;
    }
    if (userId === connectedWallet) {
      setMessage("You cannot vote for yourself!");
      return;
    }
    if (voted[userId]) {
      setMessage("You already voted for this user.");
      return;
    }
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        votes: arrayUnion(connectedWallet),
      });
      setMessage("Vote registered!");
    } catch (e) {
      setMessage("Error during voting: " + e.message);
    }
    setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-title">
        <span role="img" aria-label="trophy">🏆</span> Leaderboard
      </div>
      <div className="leaderboard-table">
        <div className="leaderboard-header">
          <span className="col-rank">#</span>
          <span className="col-user">User</span>
          <span className="col-xp">XP</span>
          <span className="col-tokens">Rank</span>
          <span className="col-followers">Followers</span>
          <span className="col-vote">Vote</span>
        </div>
        {users.map((user, i) => (
          <div className="leaderboard-row" key={user.id}>
            <span className="col-rank">{i + 1}</span>
            <span className="col-user">
              {user.avatar ? (
                <img src={user.avatar} alt="avatar" className="lb-avatar" />
              ) : (
                <span className="lb-avatar lb-avatar-default" />
              )}
              <b>{user.handle}</b>
              <span
                className="lb-badge"
                style={{
                  background: badgeColors[user.rankType] || "#999",
                  color: "#111"
                }}
              >
                {user.rankType}
              </span>
            </span>
            <span className="col-xp">{user.xp}</span>
            <span className="col-tokens">{user.tokens}</span>
            <span className="col-followers">{user.followers}</span>
            <span className="col-vote">
              <button
                className={`lb-vote-btn${voted[user.id] ? " voted" : ""}`}
                onClick={() => handleVote(user.id)}
                disabled={voted[user.id] || user.id === connectedWallet}
              >
                {voted[user.id] ? "Voté" : "Vote"}
              </button>
              <span style={{
                marginLeft: 10,
                fontWeight: 800,
                color: "#ffcc32",
                fontSize: "1.05rem",
                textShadow: "0 1px 8px #181b2455"
              }}>
                {user.votes.length || 0}
              </span>

              {/* Message d'info */}
              {message && (
                <div style={{ color: "#ffcc32", marginTop: 6, fontWeight: "600" }}>
                  {message}
                </div>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
