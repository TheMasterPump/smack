import React from "react";
import "./TechUpdates.css";

export default function TechUpdates() {
  const handleGitHubRedirect = () => {
    window.open("https://github.com/smackfun", "_blank");
  };

  return (
    <>
      <div className="tech-updates-page">
        <div className="tech-updates-container">
          <div className="header-section">
            <div className="tech-icon">
              <span className="code-symbol">&lt;/&gt;</span>
            </div>
            <h1>Tech Updates</h1>
            <p className="subtitle">Stay up-to-date with the latest Smack developments</p>
          </div>

          <div className="main-content">
            <div className="github-section">
              <h2>🚀 Open Source Development</h2>
              <p className="description">
                At Smack, we believe in transparency and community-driven development. That's why we've made our platform completely open source! 
                Every feature, improvement, and bug fix is developed openly and shared with our community.
              </p>

              <div className="benefits-grid">
                <div className="benefit-card">
                  <div className="benefit-icon">📋</div>
                  <h3>Real-time Updates</h3>
                  <p>Get instant access to our latest commits, releases, and development progress.</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">🔍</div>
                  <h3>Full Transparency</h3>
                  <p>Review our code, understand our architecture, and see exactly how Smack works under the hood.</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">🤝</div>
                  <h3>Community Contributions</h3>
                  <p>Submit issues, suggest features, or contribute code to help make Smack even better.</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">🛡️</div>
                  <h3>Security First</h3>
                  <p>Open source means our security is auditable by the community - no hidden backdoors.</p>
                </div>
              </div>
            </div>

            <div className="updates-info">
              <h2>📊 What You'll Find on Our GitHub</h2>
              <div className="features-list">
                <div className="feature-item">
                  <span className="feature-icon">📝</span>
                  <div className="feature-text">
                    <strong>Release Notes:</strong> Detailed changelogs for every update and new feature
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🐛</span>
                  <div className="feature-text">
                    <strong>Bug Fixes:</strong> Real-time tracking of issues and their resolutions
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✨</span>
                  <div className="feature-text">
                    <strong>New Features:</strong> Preview upcoming features before they go live
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔧</span>
                  <div className="feature-text">
                    <strong>Technical Documentation:</strong> Complete guides for developers and contributors
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📈</span>
                  <div className="feature-text">
                    <strong>Roadmap:</strong> Our development plans and timeline for future updates
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💡</span>
                  <div className="feature-text">
                    <strong>Ideas & Discussions:</strong> Community feature requests and development discussions
                  </div>
                </div>
              </div>
            </div>

            <div className="cta-section">
              <h2>🌟 Join Our Development Journey</h2>
              <p className="cta-description">
                Ready to dive into the code? Follow our development progress, contribute to the platform, 
                or just stay informed about the latest technical updates. Our GitHub repository is your 
                one-stop destination for everything Smack development.
              </p>
              
              <button className="github-button" onClick={handleGitHubRedirect}>
                <div className="button-content">
                  <span className="github-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </span>
                  <span className="button-text">Visit Our GitHub</span>
                  <span className="external-icon">↗</span>
                </div>
              </button>
            </div>

            <div className="community-note">
              <div className="note-icon">💬</div>
              <div className="note-content">
                <h3>Join the Discussion</h3>
                <p>
                  Have questions about our latest updates? Want to suggest a new feature? 
                  Our GitHub Issues and Discussions sections are the perfect place to connect 
                  with our development team and the Smack community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}