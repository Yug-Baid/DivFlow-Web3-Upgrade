'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Shield, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ChatMessage {
  hash: string;
  sender: string;
  content: string;
  timestamp: number;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  currentUserAddress: string;
  partnerRole?: string;
  onSendMessage: (text: string) => Promise<void>;
  status: 'connecting' | 'synced' | 'error';
  isLoading?: boolean;
  error?: string | null;
  placeholder?: string;
}

export function ChatWindow({
  messages,
  currentUserAddress,
  partnerRole = 'User',
  onSendMessage,
  status,
  isLoading = false,
  error = null,
  placeholder
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || status !== 'synced' || sending) return;

    setSending(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/5 min-h-[300px]">
        {messages.length === 0 && status === 'synced' && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Chat Ready</p>
            <p className="text-xs mt-1">Messages sync instantly via Firebase</p>
          </div>
        )}

        {(status === 'connecting' || isLoading) && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs">Syncing messages...</p>
          </div>
        )}

        {error && (
            <div className="flex flex-col items-center justify-center h-full text-destructive gap-2 text-center p-4">
            <WifiOff className="w-8 h-8" />
            <p className="text-sm font-medium">Connection Error</p>
            <p className="text-xs opacity-80">{error}</p>
            </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender.toLowerCase() === currentUserAddress.toLowerCase();
          return (
            <div key={msg.hash || `${msg.timestamp}-${msg.sender}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                isMe 
                  ? 'bg-primary text-primary-foreground rounded-br-none' 
                  : 'bg-secondary border border-border rounded-bl-none'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={placeholder || `Message ${partnerRole}...`}
              className="flex-1 bg-secondary/50 border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={status !== 'synced' || sending}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newMessage.trim() || status !== 'synced' || sending}
              className={status !== 'synced' ? 'opacity-50' : ''}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
            </Button>
          </form>
      </div>
    </div>
  );
}
