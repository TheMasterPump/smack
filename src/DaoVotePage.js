import React, { useState, useEffect } from "react";
import DaoStatsBanner from "./DaoStatsBanner";
import "./DaoVotePage.css";

// --- Plus de MOCK DATA ici ! ---

export default function DaoVotePage() {
  const [tab, setTab] = useState("active");
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les vraies données depuis une API (adapter l'URL selon ton backend)
  useEffect(() => {
    fetch("http://localhost:3001/api/proposals") // ← Mets ici ton URL API
      .then((res) => res.json())
      .then((data) => {
        setProposals(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Séparation votes actifs/passés
  const activeProposals = proposals.filter(p => p.status === "active");
  const pastProposals = proposals.filter(p => p.status === "closed");

  return (
    <div className="dao-root">
      {/* Sidebar */}
      <aside className="dao-sidebar">
        <div className="dao-logo">
          <span className="dao-logo-sub">DAO</span>
        </div>
        <nav className="dao-menu">
          <button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>Active Votes</button>
          <button className={tab === "past" ? "active" : ""} onClick={() => setTab("past")}>Past Votes</button>
          <button className={tab === "propose" ? "active" : ""} onClick={() => setTab("propose")}>Propose</button>
          <button className={tab === "governance" ? "active" : ""} onClick={() => setTab("governance")}>Governance</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dao-content">
        {/* Header */}
        <header className="dao-header">
          <div className="dao-header-center">
            <h1 className="dao-main-title">🏛️ Smack DAO</h1>
            <div className="dao-header-desc">
              <strong>Building Together, Deciding Together</strong><br />
              Smack is more than a launchpad — it's a community-driven DAO where every voice matters. 
              Our platform is built by the community, for the community. Together, we shape the future 
              of meme coin creation and trading through transparent governance and collective decision-making.
            </div>
          </div>
          <button className="dao-join-btn">🚀 Join Our DAO</button>
        </header>

        {/* Bannière DAO stats avec wrapper et orbe */}
        <div className="dao-stats-banner-wrapper">
          <div className="dao-banner-orb"></div>
          <DaoStatsBanner
            gasFees={0}
            treasury={0}
            marketcap={0}
            holders={0}
            tokensCount={0}
            totalVoters={0}
          />
        </div>

        {/* Tabs */}
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center" }}>Chargement...</div>
        ) : (
          <>
            {tab === "active" && (
              <section>
                <h2 className="dao-section-title">Active Votes</h2>
                <div className="dao-proposal-row">
                  {activeProposals.length === 0 ? (
                    <div>No active proposal.</div>
                  ) : (
                    activeProposals.map(p => (
                      <ProposalCard key={p.id} proposal={p} />
                    ))
                  )}
                </div>
              </section>
            )}

            {tab === "past" && (
              <section>
                <h2 className="dao-section-title">Past Proposals</h2>
                <div className="dao-proposal-row">
                  {pastProposals.length === 0 ? (
                    <div>No past proposal.</div>
                  ) : (
                    pastProposals.map(p => (
                      <ProposalCard key={p.id} proposal={p} />
                    ))
                  )}
                </div>
              </section>
            )}

            {tab === "propose" && (
              <section>
                <h2 className="dao-section-title">Submit a Proposal</h2>
                <div className="dao-propose-form">
                  <input className="dao-input" placeholder="Proposal title" />
                  <textarea className="dao-input" rows={4} placeholder="Describe your idea"></textarea>
                  <button className="dao-propose-btn">Submit</button>
                </div>
              </section>
            )}

            {tab === "governance" && (
              <section>
                <h2 className="dao-section-title">🗳️ How Our DAO Works</h2>
                
                <div className="dao-governance-content">
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
                    <button className="dao-primary-btn">Join the DAO</button>
                  </div>

                  <div className="dao-participation-steps">
                    <h3>📋 How to Participate</h3>
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
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// --- Proposal Card ---
function ProposalCard({ proposal }) {
  // Calcul pour la barre
  const totalVotes = proposal.yes + proposal.no;
  const yesPercent = totalVotes ? Math.round((proposal.yes / totalVotes) * 100) : 0;
  const noPercent = totalVotes ? 100 - yesPercent : 0;

  return (
    <div className="dao-proposal-card">
      <div className="dao-proposal-title">{proposal.title}</div>
      <div className="dao-proposal-desc">{proposal.description}</div>
      <div className="dao-proposal-dates">{proposal.start} – {proposal.end}</div>
      <div className="dao-vote-bar">
        <span className="yes-label">YES: {proposal.yes}</span>
        <div className="dao-bar-bg">
          <div className="dao-bar-yes" style={{ width: `${yesPercent}%` }}></div>
          <div className="dao-bar-no" style={{ width: `${noPercent}%` }}></div>
        </div>
        <span className="no-label">NO: {proposal.no}</span>
      </div>
      {proposal.status === "active" && (
        <button className="dao-vote-btn">Vote now</button>
      )}
      {proposal.status === "closed" && (
        <div className="dao-closed-badge">Closed</div>
      )}
    </div>
  );
}
