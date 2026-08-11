import { useState, KeyboardEvent } from "react";

interface Message {
  sender: "user" | "assistant";
  text: string;
  source?: string;
}

export function ChatWidget() {
  const [query, setQuery] = useState<string>("");
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // New state to track if the chat window is popped open or minimized
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg: Message = { sender: "user", text: query };
    setChatLog((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/chat/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();
      const sourceFile = data.sources?.[0]?.source || undefined;

      setChatLog((prev) => [
        ...prev,
        { sender: "assistant", text: data.answer, source: sourceFile }
      ]);
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        { sender: "assistant", text: "Error connecting to local AI server." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      {/* 1. CHATBOX PANEL (Only displays when isOpen is true) */}
      {isOpen && (
        <div style={{
          width: "360px",
          height: "460px",
          backgroundColor: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          marginBottom: "16px"
        }}>
          {/* Header Panel */}
          <div style={{
            background: "#0d6efd",
            color: "#fff",
            padding: "14px 16px",
            display: "flex",
            justifyContent: "between",
            alignItems: "center"
          }}>
            <span style={{ fontWeight: "bold" }}>LMS Study Assistant</span>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "16px" }}
            >
              ✕
            </button>
          </div>

          {/* Messages Feed View */}
          <div style={{ flex: 1, overflowY: "auto", background: "#f8f9fa", padding: "14px" }}>
            {chatLog.length === 0 && (
              <div style={{ color: "#888", textAlign: "center", marginTop: "40px", fontSize: "14px" }}>
                Ask me anything about your loaded courses or guidelines!
              </div>
            )}
            {chatLog.map((msg, idx) => (
              <div key={idx} style={{ textAlign: msg.sender === "user" ? "right" : "left", margin: "10px 0" }}>
                <div style={{ 
                  display: "inline-block", 
                  padding: "10px 14px", 
                  borderRadius: "12px", 
                  maxWidth: "80%",
                  fontSize: "14px",
                  lineHeight: "1.4",
                  background: msg.sender === "user" ? "#0d6efd" : "#e9ecef", 
                  color: msg.sender === "user" ? "#fff" : "#333" 
                }}>
                  <div>{msg.text}</div>
                  {msg.source && <small style={{ display: "block", fontSize: "10px", marginTop: "5px", color: msg.sender === "user" ? "#e0e0e0" : "#6c757d" }}>Source: {msg.source}</small>}
                </div>
              </div>
            ))}
            {loading && <div style={{ color: "#6c757d", fontSize: "12px", fontStyle: "italic" }}>Typing...</div>}
          </div>

          {/* Input Panel Base */}
          <div style={{ padding: "12px", display: "flex", gap: "8px", borderTop: "1px solid #eee", background: "#fff" }}>
            <input 
              style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px" }} 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              onKeyDown={handleKeyDown} 
              placeholder="Type your message..." 
            />
            <button 
              style={{ padding: "10px 16px", background: "#0d6efd", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }} 
              onClick={handleSend}
            >
              Ask
            </button>
          </div>
        </div>
      )}

      {/* 2. ROUND FLOATING ICON BUBBLE (Always visible to toggle opening/closing) */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "#0d6efd",
            color: "#fff",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(13, 110, 253, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {isOpen ? "💬" : "🤖"}
        </button>
      </div>
    </div>
  );
}
