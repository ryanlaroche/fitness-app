"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface FloatingChatProps {
  context: string;
  placeholder?: string;
}

export function FloatingChat({ context, placeholder = "Ask about this content..." }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/page-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + event.text,
                };
                return updated;
              });
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "Sorry, something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-[#00d4ff] rounded-full flex items-center justify-center shadow-lg hover:bg-[#33dcff] transition-colors z-50"
          aria-label="Open fitness chat"
        >
          <MessageSquare className="h-5 w-5 text-black" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 w-full sm:w-[380px] h-[60vh] bg-[#111] border border-[#222] sm:border-b-0 sm:rounded-tl-2xl sm:rounded-tr-2xl flex flex-col z-50 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#00d4ff]/10 rounded-md flex items-center justify-center">
                <MessageSquare className="h-3.5 w-3.5 text-[#00d4ff]" />
              </div>
              <span className="text-sm font-semibold text-white">Fitness Coach</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-[#555] hover:text-white transition-colors rounded-lg hover:bg-[#1a1a1a]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-[#555] text-center mt-4">
                Ask me anything about this page&apos;s content.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#00d4ff] text-black font-medium"
                      : "bg-[#1a1a1a] text-[#ccc] border border-[#2a2a2a]"
                  }`}
                >
                  {msg.content}
                  {msg.role === "assistant" && streaming && i === messages.length - 1 && msg.content === "" && (
                    <span className="inline-flex gap-1 ml-1">
                      <span className="w-1 h-1 bg-[#555] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 bg-[#555] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 bg-[#555] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-[#1f1f1f] flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#00d4ff] resize-none transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="flex-shrink-0 w-9 h-9 bg-[#00d4ff] rounded-xl flex items-center justify-center hover:bg-[#33dcff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 text-black animate-spin" />
                ) : (
                  <Send className="h-4 w-4 text-black" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
