import React, { useEffect, useState } from "react";
import bs58 from "bs58"; // Ajoute cette ligne si tu n'as pas encore installé bs58 : npm install bs58

const ADMIN_MESSAGE = "Admin login smack " + new Date().toISOString();

export default function ReportsDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);       // adresse du wallet connecté
  const [signature, setSignature] = useState(null); // signature du message
  const [signing, setSigning] = useState(false);

  // --------- CHARGEMENT DES REPORTS ----------
  useEffect(() => {
    fetch("/api/report")
      .then(res => res.json())
      .then(data => {
        let arr = [];
        if (Array.isArray(data)) arr = data;
        else if (data && Array.isArray(data.reports)) arr = data.reports;
        setReports(arr);
        setLoading(false);
      })
      .catch(() => {
        setReports([]);
        setLoading(false);
      });
  }, []);

  // --------- Connexion wallet ---------------
  const connectWallet = async () => {
    if (window.solana && window.solana.isPhantom) {
      try {
        const resp = await window.solana.connect();
        setWallet(resp.publicKey.toString());
      } catch (e) {
        alert("Connexion Phantom refusée.");
      }
    } else {
      alert("Phantom wallet non détecté !");
    }
  };

  // --------- Signature du message -----------
  const signMessage = async () => {
    setSigning(true);
    try {
      const encodedMessage = new TextEncoder().encode(ADMIN_MESSAGE);
      const signed = await window.solana.signMessage(encodedMessage, "utf8");
      setSignature(signed.signature);
      alert("Signature réussie !");
    } catch (e) {
      alert("Erreur lors de la signature : " + e.message);
    }
    setSigning(false);
  };

  // --------- BAN (sécurisé) -----------
  async function handleBan(user, chatRoom) {
    if (!wallet || !signature) return alert("Connecte et signe avec ton wallet admin d'abord !");
    if (!user) return alert("Aucun user à bannir.");
    if (!chatRoom) return alert("Aucune room fournie.");
    const res = await fetch("/api/report/ban", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wallet-address": wallet,
        "x-wallet-signature": bs58.encode(signature),
        "x-wallet-message": ADMIN_MESSAGE
      },
      body: JSON.stringify({ username: user, chatRoom })
    });
    const data = await res.json();
    if (data.success || data.alreadyBanned) {
      alert(`${user} a été banni du chat ${chatRoom}.`);
    } else {
      alert(data.error || "Erreur lors du ban.");
    }
  }

  function handleDelete(reportId) {
    alert(`(DÉMO) Delete report: ${reportId}`);
  }

  if (loading) return <div>Chargement…</div>;

  // --- DEBUG ---
  console.log("REPORTS REÇUS POUR DASHBOARD:", reports);

  return (
    <div style={{
      maxWidth: 750, margin: "40px auto", background: "#23232b", borderRadius: 12, padding: 28, color: "#fff",
      boxShadow: "0 2px 16px #0008"
    }}>
      <h2 style={{ color: "#fb4023", marginBottom: 18 }}>🛡️ Reports Dashboard</h2>

      {/* Zone wallet admin */}
      <div style={{ marginBottom: 18 }}>
        {!wallet && (
          <button onClick={connectWallet}
            style={{ background: "#ffcc32", color: "#23232b", fontWeight: 600, border: "none", borderRadius: 7, padding: "6px 18px", marginRight: 12 }}>
            Connect Wallet
          </button>
        )}
        {wallet && !signature && (
          <button onClick={signMessage} disabled={signing}
            style={{ background: "#fb4023", color: "#fff", border: "none", borderRadius: 7, padding: "6px 18px", fontWeight: 600 }}>
            {signing ? "Signature..." : "Signer pour admin"}
          </button>
        )}
        {wallet && signature && (
          <span style={{ color: "#53fa91", fontWeight: 600 }}>✅ Admin authentifié !</span>
        )}
        {wallet && (
          <span style={{ marginLeft: 16, color: "#ffcc32", fontWeight: 400, fontSize: 13 }}>
            Wallet : {wallet.slice(0, 6) + "..." + wallet.slice(-4)}
          </span>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
        <thead>
          <tr style={{ background: "#1c1b20", color: "#ffcc32" }}>
            <th>Date</th>
            <th>Message ID</th>
            <th>Reason</th>
            <th>Reported by</th>
            <th>User Reported</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 && (
            <tr>
              <td colSpan={6} style={{ color: "#fb4023", textAlign: "center" }}>Aucun report trouvé.</td>
            </tr>
          )}
          {reports.map(r => (
            <tr key={r._id} style={{ borderBottom: "1px solid #2a2a33" }}>
              <td>{new Date(r.date).toLocaleString()}</td>
              <td>{r.messageId}</td>
              <td>{r.reason}</td>
              <td>{r.reportedBy}</td>
              <td>{r.reportedUser || "-"}</td>
              <td>
                <button
                  onClick={() => handleBan(r.reportedUser, r.chatRoom)}
                  style={{
                    background: "#fb4023", color: "#fff", border: "none", borderRadius: 7, padding: "5px 11px", marginRight: 5, cursor: "pointer"
                  }}>Ban</button>
                <button
                  onClick={() => handleDelete(r._id)}
                  style={{
                    background: "#444", color: "#ffcc32", border: "none", borderRadius: 7, padding: "5px 11px", cursor: "pointer"
                  }}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
