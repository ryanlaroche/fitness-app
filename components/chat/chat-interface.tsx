"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Loader2, Bot, User } from "lucide-react";
import { ToolUpdateBadge } from "./tool-update-badge";

type ToolUpdate = {
  tool: string;
  summary: string;
};

type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "tool_update"; tool: string; summary: string };

type Message = {
  id?: number;
  role: "user" | "assistant";
  content: string;
  parts?: MessagePart[];
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMessages(data); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || streaming) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "", parts: [] }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      setLoading(false);
      setStreaming(true);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream reader");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "text" && parsed.text) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  const newParts = [...(last.parts ?? [])];
                  const lastPart = newParts[newParts.length - 1];
                  if (lastPart && lastPart.kind === "text") {
                    newParts[newParts.length - 1] = { kind: "text", text: lastPart.text + parsed.text };
                  } else {
                    newParts.push({ kind: "text", text: parsed.text });
                  }
                  updated[updated.length - 1] = { ...last, content: last.content + parsed.text, parts: newParts };
                }
                return updated;
              });
            } else if (parsed.type === "tool_update") {
              const toolUpdate: ToolUpdate = { tool: parsed.tool, summary: parsed.summary };
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  const newParts = [...(last.parts ?? [])];
                  newParts.push({ kind: "tool_update", tool: toolUpdate.tool, summary: toolUpdate.summary });
                  updated[updated.length - 1] = { ...last, parts: newParts };
                }
                return updated;
              });
            } else if (parsed.type === "done") {
              setStreaming(false);
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          parts: [{ kind: "text", text: "Sorry, something went wrong. Please try again." }],
        };
        return updated;
      });
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderAssistantContent = (msg: Message) => {
    if (msg.parts && msg.parts.length > 0) {
      return (
        <>
          {msg.parts.map((part, i) => {
            if (part.kind === "tool_update") {
              return <ToolUpdateBadge key={i} tool={part.tool} summary={part.summary} />;
            }
            if (part.kind === "text") {
              if (!part.text) return null;
              return (
                <div key={i} className="prose prose-sm max-w-none prose-invert prose-p:text-[#999] prose-headings:text-white prose-headings:font-semibold prose-li:text-[#999] prose-strong:text-white prose-code:text-[#00d4ff] prose-code:bg-[#1a1a1a] prose-hr:border-[#222]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                </div>
              );
            }
            return null;
          })}
        </>
      );
    }

    if (msg.content) {
      return (
        <div className="prose prose-sm max-w-none prose-invert prose-p:text-[#999] prose-headings:text-white prose-headings:font-semibold prose-li:text-[#999] prose-strong:text-white prose-code:text-[#00d4ff] prose-code:bg-[#1a1a1a]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
      );
    }

    return (
      <span className="inline-flex gap-1 text-[#444]">
        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>•</span>
        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>•</span>
        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>•</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#0a0a0a]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 bg-[#00d4ff] rounded-xl flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-black" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight mb-2">Your Fitness Coach</h3>
            <p className="text-[#555] max-w-sm text-sm">
              Ask anything about your workout plan, nutrition, or fitness goals.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-sm">
              {[
                "How do I modify my workout for sore muscles?",
                "What should I eat before a workout?",
                "How can I track my progress?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-left px-4 py-2.5 text-sm bg-[#111] border border-[#222] rounded-xl hover:border-[#333] hover:text-white text-[#666] transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-7 h-7 bg-[#00d4ff] rounded-lg flex items-center justify-center mt-0.5">
                <Bot className="h-3.5 w-3.5 text-black" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-tr-sm"
                  : "bg-[#111] border border-[#1f1f1f] text-[#999] rounded-tl-sm"
              }`}
            >
              {msg.role === "assistant" ? renderAssistantContent(msg) : msg.content}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-7 h-7 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg flex items-center justify-center mt-0.5">
                <User className="h-3.5 w-3.5 text-[#666]" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <textarea
            className="flex-1 px-4 py-3 bg-[#111] border border-[#222] rounded-xl resize-none focus:outline-none focus:border-[#333] text-sm text-white placeholder:text-[#444] transition-colors"
            rows={1}
            placeholder="Ask your fitness coach anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || streaming}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || streaming}
            className="flex-shrink-0 w-11 h-11 bg-[#00d4ff] text-black rounded-xl flex items-center justify-center hover:bg-[#33dcff] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
