"use client";

import * as React from "react";
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hey there! I'm your Hive financial assistant. I can help you understand your spending patterns, suggest ways to save, or answer questions about your transactions. What would you like to know?",
    timestamp: new Date(),
  },
];

export function ChatSidebar({ open, onOpenChange }: ChatSidebarProps) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response (in real app, this would call the API)
    setTimeout(() => {
      const responses = [
        "Based on your spending this month, you've spent 35% more on dining out compared to last month. Would you like some tips to reduce this?",
        "I noticed you have recurring subscriptions totaling $89.97/month. Want me to analyze if there are any you might not be using?",
        "Great question! Your housing costs are within the recommended 30% of income. You're doing well in that area!",
        "Looking at your transaction history, your biggest expense category is Housing at $1,720, followed by Food & Dining at $485.32.",
        "I can help you set up a budget based on your spending patterns. Would you like me to create a personalized plan?",
      ];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      {/* Persistent sidebar panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-40 flex h-full w-[380px] flex-col border-l border-white/10 bg-background/95 backdrop-blur-sm transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Hive Assistant
              </h2>
              <p className="text-[11px] text-muted-foreground">
                AI-powered financial advisor
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    message.role === "assistant"
                      ? "bg-linear-to-br from-amber-400 to-orange-500"
                      : "bg-linear-to-br from-violet-500 to-purple-600"
                  )}
                >
                  {message.role === "assistant" ? (
                    <Bot className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-white" />
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px]",
                    message.role === "assistant"
                      ? "rounded-tl-md bg-muted text-foreground"
                      : "rounded-tr-md bg-linear-to-br from-amber-500 to-orange-500 text-white"
                  )}
                >
                  <p className="leading-relaxed">{message.content}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      message.role === "assistant"
                        ? "text-muted-foreground"
                        : "text-white/70"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-amber-400 to-orange-500">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-md bg-muted px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-white/10 bg-background/80 p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances..."
                rows={1}
                className="w-full resize-none rounded-xl border border-white/10 bg-muted/50 px-3.5 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                style={{ minHeight: "42px", maxHeight: "100px" }}
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="h-[42px] w-[42px] shrink-0 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 p-0 text-white shadow-lg shadow-amber-500/20 transition-all hover:scale-105 hover:shadow-amber-500/40 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            AI responses are for informational purposes only
          </p>
        </div>
      </div>

      {/* Toggle button (visible when sidebar is closed) */}
      <Button
        onClick={() => onOpenChange(true)}
        className={cn(
          "fixed right-4 top-4 z-50 h-10 gap-2 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 px-3 text-white shadow-lg shadow-amber-500/20 transition-all duration-300 hover:scale-105 hover:shadow-amber-500/40",
          open && "pointer-events-none opacity-0"
        )}
      >
        <PanelRightOpen className="h-4 w-4" />
        <span className="text-xs font-medium">Chat</span>
      </Button>
    </>
  );
}

export default ChatSidebar;
