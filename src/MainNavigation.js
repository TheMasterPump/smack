import React, { useState } from "react";
import { Link } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "./MainNavigation.css";

function MainNavigation({ activePage = "home", isLaunched = false }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    {
      id: "home",
      label: "home",
      icon: "https://img.icons8.com/color/48/000000/home.png",
      path: "/home"
    },
    {
      id: "dao",
      label: "DAO",
      icon: "https://img.icons8.com/fluency/48/group.png",
      path: "/dao"
    },
    {
      id: "profile",
      label: "profile",
      icon: "https://img.icons8.com/fluency/48/name.png",
      path: "/profile"
    },
    {
      id: "support",
      label: "support",
      icon: "https://img.icons8.com/fluency/48/help.png",
      path: "/support"
    },
    {
      id: "advanced",
      label: "advanced",
      icon: "https://img.icons8.com/color/48/settings--v1.png",
      path: "/advanced"
    },
    {
      id: "more",
      label: "more",
      icon: "https://img.icons8.com/color/48/ellipsis.png",
      path: "/more"
    }
  ];

  const handleClick = (e, item) => {
    if (!isLaunched && item.id !== "dao") {
      e.preventDefault();
      return;
    }
  };

  const handleMobileMenuClick = (e, item) => {
    handleClick(e, item);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open mobile menu"
      >
        ☰
      </button>

      {/* Desktop menu */}
      <div className="main-menu-bar">
        {navItems.map((item) => {
          const isDisabled = !isLaunched && item.id !== "dao";
          return (
            <Link
              key={item.id}
              to={isDisabled ? "#" : item.path}
              className={`main-menu-item ${activePage === item.id ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
              style={{ textDecoration: "none" }}
              onClick={(e) => handleClick(e, item)}
            >
              <img
                src={item.icon}
                width="22"
                alt={item.label}
              />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="mobile-menu-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="mobile-menu-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close mobile menu"
            >
              ✕
            </button>
            
            <div className="mobile-menu-items">
              {navItems.map((item) => {
                const isDisabled = !isLaunched && item.id !== "dao";
                return (
                  <Link
                    key={item.id}
                    to={isDisabled ? "#" : item.path}
                    className={`main-menu-item ${activePage === item.id ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                    style={{ textDecoration: "none" }}
                    onClick={(e) => handleMobileMenuClick(e, item)}
                  >
                    <img
                      src={item.icon}
                      width="22"
                      alt={item.label}
                    />
                    {item.label}
                  </Link>
                );
              })}
              
              {/* Wallet et X button dans le menu mobile */}
              <div className="mobile-menu-wallet-section">
                <div className="mobile-menu-wallet">
                  <span style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px', display: 'block' }}>Connect Wallet</span>
                  <div className="wallet-button-container">
                    <WalletMultiButton />
                  </div>
                </div>
                
                <div className="mobile-menu-social">
                  <span style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px', display: 'block' }}>Follow us</span>
                  <a 
                    href="https://x.com/smackdotfun"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-x-button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      background: '#000',
                      borderRadius: '50%',
                      textDecoration: 'none',
                      border: '1px solid #333',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MainNavigation;