import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Planner from "./pages/Planner";
import Results from "./pages/Results";
import Booking from "./pages/booking";
import Chatroom from "./pages/chatroom";
import MoodBoard from "./pages/MoodBoard";
import SavedTrips from "./pages/SavedTrips";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SharedTrip from "./pages/SharedTrip";

// GitHub Pages serves the app from /<repo>/, so React Router needs a basename
// there. The single-service Django build has no PUBLIC_URL and needs none.
function routerBasename() {
  const publicUrl = process.env.PUBLIC_URL || "";
  if (!publicUrl.startsWith("http")) return undefined;
  try {
    return new URL(publicUrl).pathname.replace(/\/$/, "");
  } catch (error) {
    return undefined;
  }
}

function App() {
  return (
    <Router basename={routerBasename()}>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/results" element={<Results />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/chatroom" element={<Chatroom />} />
        <Route path="/moodboard" element={<MoodBoard />} />
        <Route path="/saved-trips" element={<SavedTrips />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/shared/:shareCode" element={<SharedTrip />} />
      </Routes>
    </Router>
  );
}

export default App;
