import React, { useEffect, useState } from "react";

export default function TokenList() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:4000/api/tokens")
      .then(res => res.json())
      .then(data => {
        setTokens(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch tokens:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading tokens...</div>;
  if (tokens.length === 0) return <div>No tokens found</div>;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#181b20",
      padding: "60px 0"
    }}>
      <style>{`
        .tokens-list {
          display: flex;
          flex-wrap: wrap;
          gap: 54px 60px;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          margin: 0 auto;
          max-width: 1240px;
        }
        .token-card {
          background: #23232a;
          border-radius: 28px;
          box-shadow: 0 8px 34px #0009, 0 2px 14px #fb402350;
          padding: 36px 44px 32px 44px;
          width: 370px;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.13s, box-shadow 0.13s, border 0.13s;
          border: 2.4px solid #2e2e33;
          position: relative;
        }
        .token-card:hover {
          border: 2.4px solid #fb4023;
          box-shadow: 0 14px 44px #fb40232a, 0 4px 20px #0004;
          transform: translateY(-8px) scale(1.028);
        }
        .token-img {
          width: 98px;
          height: 98px;
          border-radius: 50%;
          border: 2.7px solid #fb4023;
          margin-bottom: 18px;
          background: #191920;
          object-fit: cover;
        }
        .token-header {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 9px;
        }
        .token-title {
          color: #fb4023;
          font-size: 1.37rem;
          font-weight: 700;
          letter-spacing: .2px;
          margin: 0;
        }
        .token-ticker {
          color: #ffcc32;
          background: none;
          border-radius: 10px;
          font-size: 1.07rem;
          font-weight: 700;
          margin-left: 0;
        }
        .token-desc {
          color: #e4e4e4;
          font-size: 1.08rem;
          min-height: 38px;
          text-align: center;
          margin-bottom: 20px;
        }
        .mint-address {
          color: #ffeba2;
          font-family: monospace;
          font-size: 13px;
          margin-bottom: 10px;
          text-align: center;
        }
        .token-links {
          display: flex;
          gap: 12px;
          margin-bottom: 13px;
          justify-content: center;
        }
        .token-link-btn {
          background: #fb4023;
          color: #fff;
          padding: 12px 32px;
          border-radius: 11px;
          font-weight: 700;
          font-size: 1.09rem;
          margin-top: 13px;
          text-decoration: none;
          border: none;
          transition: background 0.13s;
          box-shadow: 0 4px 12px #fb402321;
        }
        .token-link-btn:hover {
          background: #cf2a0d;
        }
        .token-links a {
          background: #181b20;
          color: #ffcc32;
          border: 1.2px solid #292928;
          border-radius: 8px;
          font-size: 19px;
          padding: 4px 18px 4px 12px;
          text-decoration: none;
          transition: background 0.13s, color 0.13s;
          display: flex;
          align-items: center;
        }
        .token-links a:hover {
          background: #fb4023;
          color: #fff;
        }
        @media (max-width: 900px) {
          .token-card { width: 98vw; max-width: 390px; padding: 28px 2vw;}
        }
        @media (max-width: 600px) {
          .tokens-list { gap: 22px; }
          .token-card { width: 96vw; min-width: 0; padding: 18px 1vw;}
        }
      `}</style>
      <div className="tokens-list">
        {tokens.map(token => (
          <div key={token.slug} className="token-card">
            <img
              src={token.image || "/default.png"}
              className="token-img"
              alt={token.name}
            />
            <div className="token-header">
              <span className="token-title">{token.name}</span>
              <span className="token-ticker">{token.ticker}</span>
            </div>
            <div className="token-desc">
              {token.description ? token.description : "No description"}
            </div>
            <div className="mint-address">
              <b>Mint Address:</b>{" "}
              {token.mintAddress ? token.mintAddress : "-"}
            </div>
            <div className="token-links">
              {token.twitter && (
                <a href={token.twitter} target="_blank" rel="noopener noreferrer">
                  <span>🐦</span>
                </a>
              )}
              {token.telegram && (
                <a href={token.telegram} target="_blank" rel="noopener noreferrer">
                  <span>✈️</span>
                </a>
              )}
              {token.websiteOption && (
                <a
                  href={token.websiteOption}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Site
                </a>
              )}
            </div>
            <a
              className="token-link-btn"
              href={`/token/${token.slug}`}
            >
              Voir +
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
