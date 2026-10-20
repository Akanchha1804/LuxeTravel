import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  apiFetch,
  clearAuth,
  getStoredUsername,
  isLoggedIn,
  subscribeAuth,
} from "../services/api";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(isLoggedIn());
  const username = getStoredUsername();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => subscribeAuth(() => setToken(isLoggedIn())), []);

  const handleLogout = async () => {
    try {
      await apiFetch("/logout/", { method: "POST" });
    } catch (error) {
      // Clearing local credentials is still the right thing to do.
    }
    clearAuth();
    navigate("/login");
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          ✨ LuxeTravel
        </Link>

        <div className="menu-icon" onClick={() => setIsOpen(!isOpen)}>
          <div className={isOpen ? "bar open" : "bar"}></div>
          <div className={isOpen ? "bar open" : "bar"}></div>
          <div className={isOpen ? "bar open" : "bar"}></div>
        </div>

        <ul className={isOpen ? "navbar-menu active" : "navbar-menu"}>
          <li>
            <Link to="/" onClick={() => setIsOpen(false)}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/planner" onClick={() => setIsOpen(false)}>
              Plan Trip
            </Link>
          </li>
          <li>
            <Link to="/moodboard" onClick={() => setIsOpen(false)}>
              Mood Board
            </Link>
          </li>
          {token && (
            <li>
              <Link to="/saved-trips" onClick={() => setIsOpen(false)}>
                My Trips
              </Link>
            </li>
          )}
          <li>
            <Link to="/chatroom" onClick={() => setIsOpen(false)}>
              Chat
            </Link>
          </li>
          {token ? (
            <li className="nav-user">
              <span title={username}>👤 {username || "Account"}</span>
              <button onClick={handleLogout} className="nav-btn">
                Logout
              </button>
            </li>
          ) : (
            <li>
              <Link
                to="/login"
                className="nav-btn"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
