import React, { useState } from "react";
import { Link } from "react-router-dom";
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MainNavigation;