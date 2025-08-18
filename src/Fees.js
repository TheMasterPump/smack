import React from "react";
import "./Fees.css";

export default function Fees() {
  return (
    <>
      <div className="fees-page">
        <div className="fees-container">
          <h1>Fees</h1>
          <p className="fees-intro">
            The following are fees charged by the smack.fun platform when you use our services:
          </p>

          <div className="fees-table-wrapper">
            <h2>Platform Fees</h2>
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Create a coin</td>
                  <td className="fee-amount">0.04 SOL</td>
                </tr>
                <tr>
                  <td>Generate AI images for your coin</td>
                  <td className="fee-amount free">FREE</td>
                </tr>
                <tr>
                  <td>Generate website for your coin</td>
                  <td className="fee-amount free">FREE</td>
                </tr>
                <tr>
                  <td>Modify generated websites</td>
                  <td className="fee-amount free">FREE</td>
                </tr>
                <tr>
                  <td>Buy or sell a coin while on the bonding curve</td>
                  <td className="fee-amount">1% of total purchase/sale price (in SOL)</td>
                </tr>
                <tr>
                  <td>When a coin graduates to SmackSwap*</td>
                  <td className="fee-amount">0.015 SOL</td>
                </tr>
                <tr>
                  <td>SmackSwap trade</td>
                  <td className="fee-amount">0.3%</td>
                </tr>
              </tbody>
            </table>
            
            <div className="fee-note">
              <p><strong>*</strong> This is a fixed fee of 0.015 SOL that includes network fees even though these may vary from time to time. This 0.015 SOL is taken from the liquidity of the coin and does not require the user to pay this as an additional amount.</p>
            </div>
          </div>

          <div className="additional-info">
            <h2>Additional Information</h2>
            
            <div className="info-section">
              <h3>Frontend Services</h3>
              <p>None of the smack.fun frontend services (the smack.fun web app, smack.fun/advanced, and the smack.fun mobile app) charge any fees in addition to those above. If you access the smack.fun platform or smart contracts via another interface or platform, you may incur additional fees charged by those interfaces or platforms.</p>
            </div>

            <div className="info-section">
              <h3>Creator Rewards</h3>
              <p>On every trade, the original creator of the coin receives <span className="highlight">0.05%</span> of all trade fees. This is applicable for all coins that were present on the bonding curve or SmackSwap from the date of launch.</p>
            </div>

            <div className="info-section exclusive">
              <h3>🎨 Exclusive Smack Features</h3>
              <div className="feature-list">
                <div className="feature-item">
                  <div className="feature-icon">🤖</div>
                  <div className="feature-content">
                    <h4>AI Image Generation</h4>
                    <p>Create stunning, unique images for your meme coins using our advanced AI technology - completely free!</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🌐</div>
                  <div className="feature-content">
                    <h4>Auto Website Generation</h4>
                    <p>Get a professional website automatically generated for your coin - no coding required, totally free!</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">✏️</div>
                  <div className="feature-content">
                    <h4>Website Customization</h4>
                    <p>Modify and customize your generated websites with our easy-to-use editor - always free!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="fee-transparency">
            <h2>Fee Transparency</h2>
            <p>At Smack, we believe in transparent pricing. All fees are clearly displayed before any transaction, and we never charge hidden fees. Our goal is to make meme coin creation and trading as accessible and affordable as possible for everyone.</p>
            
            <div className="contact-info">
              <p>Have questions about our fees? <a href="/support" className="support-link">Contact our support team</a></p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}