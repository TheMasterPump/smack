import React, { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import './HomePage.css';
import { Link } from "react-router-dom"; // AJOUT ICI
import TokenList from './TokenList'; // chemin à adapter selon ton projet
import MainNavigation from './MainNavigation';

export default function HomePage() {
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);

  function getHypeEmoji(count) {
    if (count >= 500) return "💎";
    if (count >= 200) return "🌋";
    if (count >= 100) return "🚀";
    if (count >= 75) return "💥";
    if (count >= 25) return "🔥";
    return "";
  }

  async function fetchTokens() {
    const res = await fetch("/api/tokens");
    if (!res.ok) return;
    const data = await res.json();
    setTokens(data);
    setFilteredTokens(data);
  }

  useEffect(() => {
    fetchTokens();
  }, []);

  function renderTrending() {
    if (!tokens.length) {
      return <span style={{ color: "#fb4023" }}>Aucun token</span>;
    }
    const trending = [...tokens]
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .slice(0, 5);

    return trending.map((token) => (
      <div key={token.slug} className="trending-token-card">
        <img src={token.image} alt={token.name} />
        <span className="trending-token-ticker">{token.ticker}</span>
        <span>{getHypeEmoji(token.votes || 0)}</span>
      </div>
    ));
  }

  function renderTokens() {
    if (!filteredTokens.length) {
      return <p style={{ color: "#fb4023" }}>No token launched yet. Be the first one!</p>;
    }
    return filteredTokens.map((token) => (
      <Link
        to={`/tokens/${token.slug}`}
        key={token.slug}
        className="token-card"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <img className="token-img" src={token.image} alt={token.name} />
        <div className="token-info">
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span className="token-title">{token.name.replace(/\s*\(\$.*?\)/, "")}</span>
            <span className="token-ticker">{token.ticker}</span>
          </div>
          <span className="token-desc">{token.description || ""}</span>
          <div className="token-details-row">
            <span className="token-marketcap">
              Marketcap: {token.marketcap ? "$" + token.marketcap.toLocaleString() : "-"}
            </span>
            <span className="token-votes">🔥 {token.votes || 0}</span>
            <span className="token-creator">
              By: {(token.creator || "").slice(0, 7)}...{(token.creator || "").slice(-4)}
            </span>
          </div>
          <div className="token-links-row">
            <a className="token-link" href={token.url} target="_blank" rel="noreferrer">
              View
            </a>
            <a
              className="token-chat-link"
              href={`/chat.html?slug=${token.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              Chat 💬
            </a>
            <button className="vote-btn" onClick={e => { e.preventDefault(); alert("Vote envoyé !") }}>
              Vote
            </button>
          </div>
        </div>
      </Link>
    ));
  }

  function filterTokens(e) {
    const query = e.target.value.trim().toLowerCase();
    if (!query) {
      setFilteredTokens(tokens);
    } else {
      setFilteredTokens(
        tokens.filter(
          (token) =>
            (token.name && token.name.toLowerCase().includes(query)) ||
            (token.ticker && token.ticker.toLowerCase().includes(query)) ||
            (token.description && token.description.toLowerCase().includes(query))
        )
      );
    }
  }

  const scrollTrending = (direction) => {
    const trendingBar = document.getElementById("trending-bar");
    if (trendingBar) {
      trendingBar.scrollBy({ left: direction * 250, behavior: "smooth" });
    }
  };

  return (
    <>
      <MainNavigation activePage="home" isLaunched={true} />

      <main>
        <div className="big-title">Launch Your Own Smack Coin</div>
        <div className="desc">
          Create, customize and launch your meme token instantly on Solana. No
          code, no hassle, just memes.
          <br />
        </div>
        <button className="big-btn" onClick={() => window.location.href = "form.html"}>
          Create Token
        </button>

        <div className="trending-bar-wrapper">
          <span className="trending-title"> Trending now:</span>
          <div id="trending-bar" className="trending-bar">
            {renderTrending()}
          </div>
          <div className="trending-arrows-right">
            <button
              className="trending-arrow"
              id="trend-left"
              onClick={() => scrollTrending(-1)}
              aria-label="Scroll trending left"
            >
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="18" fill="#181b20" />
                <polyline
                  points="24,13 17,20 24,27"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="trending-arrow"
              id="trend-right"
              onClick={() => scrollTrending(1)}
              aria-label="Scroll trending right"
            >
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="18" fill="#181b20" />
                <polyline
                  points="16,13 23,20 16,27"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for a token…"
            onChange={filterTokens}
          />
        </div>

        <h2>Latest Tokens</h2>
        <div id="tokens-list" className="tokens-list">
          {renderTokens()}
        </div>
      </main>
    </>
  );
}
