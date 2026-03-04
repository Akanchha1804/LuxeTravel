import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
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
            <li>
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
