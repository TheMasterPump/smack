import React from "react";
import "./DaoInfo.css";

export default function DaoInfo() {
  const handleJoinDao = () => {
    // Redirect to the main DAO page
    window.location.href = "/dao";
  };

  return (
    <>
      <div className="dao-info-page">
        <div className="dao-info-container">
          <div className="header-section">
            <div className="dao-icon">
              <span className="governance-symbol">🏛️</span>
            </div>
            <h1>🗳️ How Our DAO Works</h1>
            <p className="subtitle">Decentralized governance for the Smack community</p>
          </div>

          <div className="main-content">
            <div className="dao-explanation-section">
              <div className="dao-info-card">
                <h3>🤝 Community-Driven Platform</h3>
                <p>
                  Smack is built as a decentralized autonomous organization (DAO) where our community 
                  collectively makes decisions about the platform's future. Every feature, update, 
                  and policy change is decided through community voting.
                </p>
              </div>

              <div className="dao-info-card">
                <h3>🪙 $SMACK Token Governance</h3>
                <p>
                  To participate in our DAO, you need to hold $SMACK tokens. These tokens grant you:
                </p>
                <ul>
                  <li><strong>Voting Rights:</strong> Vote on all platform proposals</li>
                  <li><strong>Proposal Power:</strong> Submit your own ideas for community consideration</li>
                  <li><strong>Discussion Access:</strong> Join governance discussions and debates</li>
                  <li><strong>Platform Influence:</strong> Help shape the future of Smack</li>
                </ul>
              </div>

              <div className="dao-info-card">
                <h3>🏗️ Building Together</h3>
                <p>
                  Our development roadmap, feature priorities, fee structures, and platform policies 
                  are all decided by our community. We believe that the best platforms are built 
                  when users have a direct say in their evolution.
                </p>
              </div>

              <div className="dao-info-card dao-join-card">
                <h3>🚀 Ready to Join?</h3>
                <p>
                  Get $SMACK tokens and become part of our governance community. Your voice matters, 
                  and together we're building the future of decentralized meme coin creation.
                </p>
                <button className="dao-primary-btn" onClick={handleJoinDao}>Join the DAO</button>
              </div>
            </div>

            <div className="participation-guide">
              <h2>📋 How to Participate</h2>
              <div className="dao-steps">
                <div className="dao-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Get $SMACK Tokens</h4>
                    <p>Acquire $SMACK tokens to unlock voting rights</p>
                  </div>
                </div>
                <div className="dao-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Connect Your Wallet</h4>
                    <p>Link your wallet to access DAO features</p>
                  </div>
                </div>
                <div className="dao-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Vote & Propose</h4>
                    <p>Participate in votes and submit your own proposals</p>
                  </div>
                </div>
                <div className="dao-step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Shape Smack's Future</h4>
                    <p>Help build the platform together with our community</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="governance-benefits">
              <h2>🌟 Why Join Our DAO?</h2>
              <div className="benefits-grid">
                <div className="benefit-card">
                  <div className="benefit-icon">🗳️</div>
                  <h3>Direct Democracy</h3>
                  <p>Your vote directly impacts platform decisions and future development.</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">💡</div>
                  <h3>Innovation Driven</h3>
                  <p>Propose new features and improvements that benefit the entire community.</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">🔍</div>
                  <h3>Full Transparency</h3>
                  <p>All decisions are made openly with complete visibility into the process.</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">🤝</div>
                  <h3>Community First</h3>
                  <p>Connect with like-minded builders and creators in our governance community.</p>
                </div>
              </div>
            </div>

            <div className="community-note">
              <div className="note-icon">💬</div>
              <div className="note-content">
                <h3>Join the Conversation</h3>
                <p>
                  Ready to be part of something bigger? Our DAO is where the magic happens. 
                  Connect with fellow community members, share your ideas, and help shape 
                  the future of decentralized meme coin creation. Every voice counts in our 
                  democratic governance system.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}