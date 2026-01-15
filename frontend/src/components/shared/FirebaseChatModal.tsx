'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatWindow, ChatMessage } from './ChatWindow';
import { sendMessage, subscribeToMessages } from '@/lib/firebase';

interface FirebaseChatModalProps {
  propertyId: string;
  inspectorAddress: string;
  revenueAddress: string;
  currentUserAddress: string;
  onClose: () => void;
  isChatDisabled?: boolean;
}

export function FirebaseChatModal({
  propertyId,
  inspectorAddress,
  revenueAddress,
  currentUserAddress,
  onClose,
  isChatDisabled = false
}: FirebaseChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus('connecting');
    
    try {
      // Subscribe to messages
      const unsubscribe = subscribeToMessages(propertyId, (newMessages) => {
        // Map Firebase messages to ChatMessage format
        const mapped = newMessages.map(m => ({
          hash: m.id || `${m.timestamp}-${m.sender}`,
          sender: m.sender,
          content: m.content,
          timestamp: m.timestamp,
        }));
        setMessages(mapped);
        setStatus('synced');
      });

      return () => {
        unsubscribe();
      };
    } catch (err: any) {
      console.error('Failed to connect to Firebase chat:', err);
      setError(err.message || 'Failed to connect');
      setStatus('error');
    }
  }, [propertyId]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (isChatDisabled) return;
    
    try {
      await sendMessage(propertyId, currentUserAddress, text);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      throw err;
    }
  }, [propertyId, currentUserAddress, isChatDisabled]);

  // Determine chat partner role
  const isInspector = currentUserAddress.toLowerCase() === inspectorAddress.toLowerCase();
  const partnerRole = isInspector ? 'Revenue Officer' : 'Land Inspector';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-background/95 border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Property #{propertyId} Chat</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${status === 'synced' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                <span>{status === 'synced' ? 'Connected' : status === 'error' ? 'Error' : 'Connecting...'}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatWindow
            messages={messages}
            currentUserAddress={currentUserAddress}
            partnerRole={partnerRole}
            status={status}
            error={error}
            onSendMessage={handleSendMessage}
            placeholder={isChatDisabled ? 'Chat disabled for this property' : undefined}
          />
        </div>
      </div>
    </div>
  );
}
