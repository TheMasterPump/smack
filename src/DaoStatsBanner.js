// DaoStatsBanner.js
import React from "react";
import "./DaoStatsBanner.css";

export default function DaoStatsBanner({ gasFees, treasury, marketcap, holders, tokensCount, totalVoters }) {
  return (
    <div className="dao-banner-glow-wrap">
      {/* Orbe rouge lumineuse */}
      <div className="dao-banner-orb"></div>
      {/* Bannière principale */}
      <div className="dao-banner-animated">
        <div className="dao-banner-stat">
          <div className="dao-banner-title">Gas Fees</div>
          <div className="dao-banner-value fees">{gasFees} SOL</div>
        </div>
        <div className="dao-banner-stat">
          <div className="dao-banner-title">Treasury</div>
          <div className="dao-banner-value treasury">{treasury} SOL</div>
        </div>
        <div className="dao-banner-stat">
          <div className="dao-banner-title">Marketcap</div>
          <div className="dao-banner-value marketcap">${marketcap.toLocaleString()}</div>
        </div>
        <div className="dao-banner-stat">
          <div className="dao-banner-title">Holders</div>
          <div className="dao-banner-value holders">{holders}</div>
        </div>
        <div className="dao-banner-stat">
          <div className="dao-banner-title">Tokens Launched</div>
          <div className="dao-banner-value tokens">{tokensCount}</div>
        </div>
        <div className="dao-banner-stat">
          <div className="dao-banner-title">Total voters</div>
          <div className="dao-banner-value voters">{totalVoters}</div>
        </div>
      </div>
    </div>
  );
}
