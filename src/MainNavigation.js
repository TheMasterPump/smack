import React from "react";
import { Link } from "react-router-dom";
import "./MainNavigation.css";

export default function MainNavigation({ activePage = "home", isLaunched = false }) {
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

  return (
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
  );
}