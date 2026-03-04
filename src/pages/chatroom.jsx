import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./chatroom.css";

const Chatroom = () => {
  const navigate = useNavigate();
  const [view, setView] = useState("lobby"); // 'lobby' or 'room'
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [privateCode, setPrivateCode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    name: "",
    description: "",
    is_private: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Username state
  const [username, setUsername] = useState(
    localStorage.getItem("chat_username") ||
      localStorage.getItem("username") ||
      "",
  );
  const [isUsernameSet, setIsUsernameSet] = useState(!!username);

  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  // Fetch public rooms on load
  useEffect(() => {
    fetchRooms();
    return () => stopPolling();
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSetUsername = (e) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem("chat_username", username);
      setIsUsernameSet(true);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/chatrooms/");
      if (response.ok) {
        const data = await response.json();
        // Filter out private rooms from the public list if the API returns them
        setRooms(data.filter((r) => !r.is_private));
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
    }
  };

  const startPolling = (roomId) => {
    stopPolling();
    fetchMessages(roomId); // Initial fetch
    pollInterval.current = setInterval(() => fetchMessages(roomId), 2000); // Poll every 2s
  };

  const stopPolling = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
  };

  const fetchMessages = async (roomId) => {
    if (!roomId) return;
    try {
      const response = await fetch(
        `http://localhost:8000/api/chatrooms/${roomId}/messages/`,
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/chatrooms/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRoomData),
      });

      if (response.ok) {
        const room = await response.json();
        setShowCreateModal(false);
        setNewRoomData({ name: "", description: "", is_private: false });
        joinRoom(room);
        if (!room.is_private) fetchRooms(); // Refresh list if public
      }
    } catch (err) {
      setError("Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPrivate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        "http://localhost:8000/api/chatrooms/join_private/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_code: privateCode }),
        },
      );

      if (response.ok) {
        const room = await response.json();
        joinRoom(room);
        setPrivateCode("");
      } else {
        setError("Invalid Room Code");
      }
    } catch (err) {
      setError("Error joining room");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId, e) => {
    e.stopPropagation(); // Prevent joining the room when clicking delete
    if (!window.confirm("Are you sure you want to delete this room?")) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/chatrooms/${roomId}/`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setRooms(rooms.filter((room) => room.id !== roomId));
      } else {
        alert("Failed to delete room");
      }
    } catch (err) {
      console.error("Error deleting room:", err);
    }
  };

  const joinRoom = (room) => {
    if (!isUsernameSet) {
      alert("Please set a username first!");
      return;
    }
    setCurrentRoom(room);
    setView("room");
    setMessages([]);
    startPolling(room.id);
  };

  const leaveRoom = () => {
    stopPolling();
    setCurrentRoom(null);
    setView("lobby");
    setMessages([]);
    fetchRooms(); // Refresh lobby
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const senderName = localStorage.getItem("chat_username") || "Guest";

    try {
      const response = await fetch(
        `http://localhost:8000/api/chatrooms/${currentRoom.id}/messages/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: senderName,
            content: newMessage,
            room: currentRoom.id,
          }),
        },
      );

      if (response.ok) {
        setNewMessage("");
        fetchMessages(currentRoom.id); // Immediate update
      } else {
        console.error("Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // --- RENDER ---

  if (view === "lobby") {
    return (
      <div className="chatroom-container">
        <div className="lobby-card">
          <div className="lobby-header">
            <h1>💬 Trip Chat Lobby</h1>
            <p>Join a public room or create your own private space</p>
          </div>

          {/* Username Setter */}
          {!isUsernameSet ? (
            <div className="username-section">
              <h3>Choose a Username to Chat</h3>
              <form onSubmit={handleSetUsername} className="username-form">
                <input
                  type="text"
                  placeholder="Enter your name..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <button type="submit">Start Chatting</button>
              </form>
            </div>
          ) : (
            <>
              <div className="user-welcome">
                <p>
                  Logged in as: <strong>{username}</strong>
                </p>
                <button
                  onClick={() => setIsUsernameSet(false)}
                  className="change-user-btn"
                >
                  Change
                </button>
              </div>

              {/* Actions Bar */}
              <div className="lobby-actions">
                <button
                  className="create-btn"
                  onClick={() => setShowCreateModal(true)}
                >
                  + Create New Room
                </button>
                <form
                  onSubmit={handleJoinPrivate}
                  className="join-private-form"
                >
                  <input
                    type="text"
                    placeholder="Enter Private Code"
                    value={privateCode}
                    onChange={(e) => setPrivateCode(e.target.value)}
                  />
                  <button type="submit">Join</button>
                </form>
              </div>
              {error && <div className="error-msg">{error}</div>}

              {/* Public Rooms Grid */}
              <div className="rooms-grid">
                {rooms.map((room) => (
                  <div key={room.id} className="room-card">
                    <h3>{room.name}</h3>
                    <p>{room.description || "No description"}</p>
                    <div className="room-actions">
                      <button
                        onClick={() => joinRoom(room)}
                        className="join-btn"
                      >
                        Join Room
                      </button>
                      <button
                        onClick={(e) => handleDeleteRoom(room.id, e)}
                        className="delete-btn"
                        title="Delete Room"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
                {rooms.length === 0 && (
                  <p className="no-rooms">
                    No public rooms available. Create one!
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Create Room Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Create New Room</h2>
              <form onSubmit={handleCreateRoom}>
                <div className="form-group">
                  <label>Room Name</label>
                  <input
                    type="text"
                    required
                    value={newRoomData.name}
                    onChange={(e) =>
                      setNewRoomData({ ...newRoomData, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newRoomData.description}
                    onChange={(e) =>
                      setNewRoomData({
                        ...newRoomData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={newRoomData.is_private}
                      onChange={(e) =>
                        setNewRoomData({
                          ...newRoomData,
                          is_private: e.target.checked,
                        })
                      }
                    />
                    Private Room (Requires Code)
                  </label>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="confirm-btn"
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create Room"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ROOM VIEW
  return (
    <div className="chatroom-container">
      <div className="chat-window">
        <div className="chat-header">
          <div className="header-left">
            <button onClick={leaveRoom} className="back-btn">
              ← Lobby
            </button>
          </div>
          <div className="header-center">
            <h2>{currentRoom.name}</h2>
            {currentRoom.is_private && (
              <span className="room-code-badge">
                Code: {currentRoom.room_code}
              </span>
            )}
          </div>
          <div className="header-right">
            <span className="current-user-badge">👤 {username}</span>
          </div>
        </div>

        <div className="messages-list">
          {messages.length === 0 && (
            <div className="no-messages">No messages yet. Say hello! 👋</div>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.sender === username;
            return (
              <div key={idx} className={`message ${isMe ? "me" : "other"}`}>
                <div className="message-content">
                  {!isMe && <span className="user-name">{msg.sender}</span>}
                  <p>{msg.content}</p>
                  <span className="timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-area">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message as ${username}...`}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};

export default Chatroom;
