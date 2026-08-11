import { ReactNode, useState, useEffect, KeyboardEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { NotificationBell } from './NotificationBell';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }


    // --- CUSTOM LOCAL RAG PIPELINE STATES ---
  interface Message {
    sender: "user" | "assistant";
    text: string;
    source?: string;
  }

  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatQuery, setChatQuery] = useState<string>("");
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const handleChatSend = async () => {
    if (!chatQuery.trim()) return;

    const userMsg: Message = { sender: "user", text: chatQuery };
    setChatLog((prev) => [...prev, userMsg]);
    setChatQuery("");
    setIsChatLoading(true);

    try {
      // Hits your active server.js instance on port 5000
      const res = await fetch("http://localhost:4000/api/chat/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatQuery }),
      });
      const data = await res.json();
      
      // Safely check for array metadata citations from index 0 mapping
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
      setIsChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleChatSend();
  };
  // --- END RAG CHAT LOGIC ---

  return (
    <div className="min-h-screen bg-background relative">
      <AppSidebar />
      <main 
        className={cn(
          "transition-all duration-300 min-h-screen",
          "ml-16 lg:ml-64"
        )}
      >
        <div className="flex justify-end px-6 pt-4 lg:px-8">
          <NotificationBell />
        </div>
        <div className="p-6 pt-2 lg:p-8 lg:pt-2">
          {children}
        </div>
      </main>


<div style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 9999, fontFamily: "sans-serif" }}>
  
  {/* THE RAG CHAT WINDOW PANEL */}
  {isChatOpen && (
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
      position: "absolute",
      bottom: "75px", // Suspends window cleanly directly above your icon
      right: "0"
    }}>
      {/* Header Bar */}
      <div style={{ background: "#0d6efd", color: "#fff", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: "bold" }}>LMS Study Assistant</span>
        <button onClick={() => setIsChatOpen(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "16px" }}>✕</button>
      </div>

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f8f9fa", padding: "14px" }}>
        {chatLog.length === 0 && (
          <div style={{ color: "#888", textAlign: "center", marginTop: "40px", fontSize: "14px" }}>
            Ask me anything about your loaded courses or guidelines!
          </div>
        )}
        {chatLog.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.sender === "user" ? "right" : "left", margin: "10px 0" }}>
            <div style={{ 
              display: "inline-block", padding: "10px 14px", borderRadius: "12px", maxWidth: "80%", fontSize: "14px", lineHeight: "1.4",
              background: msg.sender === "user" ? "#0d6efd" : "#e9ecef", color: msg.sender === "user" ? "#fff" : "#333" 
                }}>
              <div>{msg.text}</div>
              {msg.source && <small style={{ display: "block", fontSize: "10px", marginTop: "5px", color: msg.sender === "user" ? "#e0e0e0" : "#6c757d" }}>Source: {msg.source}</small>}
            </div>
          </div>
        ))}
        {isChatLoading && <div style={{ color: "#6c757d", fontSize: "12px", fontStyle: "italic" }}>Typing...</div>}
      </div>

      {/* Input Action Base Row */}
      <div style={{ padding: "12px", display: "flex", gap: "8px", borderTop: "1px solid #eee", background: "#fff" }}>
        <input style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px" }} value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} onKeyDown={handleChatKeyDown} placeholder="Type your message..." />
        <button style={{ padding: "10px 16px", background: "#0d6efd", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }} onClick={handleChatSend}>Ask</button>
      </div>
    </div>
  )}


      {/* Floating Chatbot Button */}
      <button
        onClick={() => {
          setIsChatOpen(!isChatOpen);
        }}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer group"
        )}
        title="Query / Doubts chatbot"
        id="chatbot-trigger-button"
        type="button"
      >
        <MessageCircle className="w-7 h-7 transition-transform group-hover:rotate-12" />
        <span className="absolute right-16 scale-0 group-hover:scale-100 transition-all duration-150 origin-right bg-popover text-popover-foreground border text-xs px-2.5 py-1.5 rounded-lg shadow-md whitespace-nowrap font-medium">
          Queries & Doubts Help
        </span>
      </button>
    </div>
  </div>
  );
}

