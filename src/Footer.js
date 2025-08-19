import React from "react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="global-footer">
      <div className="footer-content">
        <div className="footer-copyright">
          © smack.fun 2025
        </div>
        <div className="footer-links">
          <a href="/privacy" className="footer-link">Privacy policy</a>
          <span className="footer-separator">|</span>
          <a href="/terms" className="footer-link">Terms of service</a>
          <span className="footer-separator">|</span>
          <a href="/fees" className="footer-link">Fees</a>
          <span className="footer-separator">|</span>
          <a href="/dao-info" className="footer-link">DAO</a>
          <span className="footer-separator">|</span>
          <a href="/updates" className="footer-link">Tech updates</a>
        </div>
      </div>
    </footer>
  );
}