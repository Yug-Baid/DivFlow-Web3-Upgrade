'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Shield, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIPFS } from '@/contexts/IPFSContext';
import { ChatWindow, ChatMessage } from './ChatWindow';

interface IPFSChatModalProps {
  propertyId: string;
  inspectorAddress: string;
  revenueAddress: string;
  currentUserAddress: string;
  onClose: () => void;
  isChatDisabled?: boolean;
}

export function IPFSChatModal({
  propertyId,
  inspectorAddress,
  revenueAddress,
  currentUserAddress,
  onClose,
  isChatDisabled = false
}: IPFSChatModalProps) {
  const { connectToChat, isReady, error: ipfsError } = useIPFS();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [db, setDb] = useState<any>(null);
  const [status, setStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');
  const [isPinataConnected, setIsPinataConnected] = useState(false);

  // Merge messages helper - combines messages from different sources and deduplicates
  const mergeMessages = useCallback((existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
    const combined = new Map<string, ChatMessage>();

    // Add existing messages
    existing.forEach(m => {
      const key = m.hash || `${m.timestamp}-${m.sender.toLowerCase().slice(0, 10)}`;
      combined.set(key, m);
    });

    // Add incoming messages (may overwrite)
    incoming.forEach(m => {
      const key = m.hash || `${m.timestamp}-${m.sender.toLowerCase().slice(0, 10)}`;
      combined.set(key, m);
    });

    return Array.from(combined.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, []);

  // Load messages from Pinata (cloud backup)
  const loadFromPinata = useCallback(async (): Promise<ChatMessage[]> => {
    try {
      const response = await fetch(`/api/chat?propertyId=${propertyId}`);
      const data = await response.json();

      if (data.success && data.messages) {
        setIsPinataConnected(true);
        // Map Pinata messages to ChatMessage format
        return data.messages.map((m: any) => ({
          hash: m.id || `${m.timestamp}-${m.sender.toLowerCase().slice(0, 10)}`,
          sender: m.sender,
          content: m.content,
          timestamp: m.timestamp
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to load from Pinata:', error);
      setIsPinataConnected(false);
      return [];
    }
  }, [propertyId]);

  // Save message to Pinata (cloud backup)
  const saveToPinata = useCallback(async (sender: string, content: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, sender, content })
      });

      const data = await response.json();

      if (data.success) {
        setIsPinataConnected(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save to Pinata:', error);
      setIsPinataConnected(false);
      return false;
    }
  }, [propertyId]);

  // Load messages from OrbitDB (P2P)
  const loadFromOrbitDB = useCallback(async (database: any): Promise<ChatMessage[]> => {
    try {
      const all: any[] = [];
      for await (const doc of database.iterator({ limit: -1 })) {
        all.push(doc);
      }

      return all.filter(item => {
        const content = item?.payload?.value || item?.value;
        return !!content;
      }).map((item) => {
        const val = item.payload?.value || item.value;
        return {
          hash: item.hash,
          sender: val.sender,
          content: val.content,
          timestamp: val.timestamp
        };
      }).sort((a, b) => a.timestamp - b.timestamp);
    } catch (e) {
      console.error('Error loading from OrbitDB:', e);
      return [];
    }
  }, []);

  // Initialize chat - load from all sources
  useEffect(() => {
    let mounted = true;
    let database: any;

    const initChat = async () => {
      setStatus('connecting');

      // 1. Load from localStorage first (instant)
      const local = localStorage.getItem(`chat-${propertyId}`);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (mounted) setMessages(parsed);
        } catch (e) {
          console.error("Failed to load local chat:", e);
        }
      }

      // 2. Load from Pinata (cloud backup - authoritative)
      const pinataMessages = await loadFromPinata();
      if (mounted && pinataMessages.length > 0) {
        setMessages(prev => mergeMessages(prev, pinataMessages));
      }

      // 3. Connect to OrbitDB for P2P sync
      if (isReady) {
        try {
          database = await connectToChat(propertyId);
          if (!mounted) return;
          setDb(database);

          // Load from OrbitDB
          const orbitMessages = await loadFromOrbitDB(database);
          if (mounted && orbitMessages.length > 0) {
            setMessages(prev => mergeMessages(prev, orbitMessages));
          }

          // Listen for P2P updates
          database.events.on('update', async () => {
            if (mounted) {
              const newMessages = await loadFromOrbitDB(database);
              setMessages(prev => mergeMessages(prev, newMessages));
            }
          });

        } catch (err) {
          console.error('Failed to connect to OrbitDB:', err);
          // Non-fatal - we still have Pinata backup
        }
      }

      if (mounted) setStatus('synced');
    };

    initChat();

    return () => {
      mounted = false;
      if (database) {
        database.close().catch(console.error);
      }
    };
  }, [propertyId, isReady, connectToChat, loadFromPinata, loadFromOrbitDB, mergeMessages]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat-${propertyId}`, JSON.stringify(messages));
    }
  }, [messages, propertyId]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (text: string) => {
    const timestamp = Date.now();
    const newMessage: ChatMessage = {
      hash: `${timestamp}-${currentUserAddress.toLowerCase().slice(0, 10)}`,
      sender: currentUserAddress,
      content: text,
      timestamp
    };

    // Optimistically add message to UI
    setMessages(prev => [...prev, newMessage]);

    // Save to all backends in parallel
    const savePromises: Promise<any>[] = [];

    // 1. Save to Pinata (cloud backup - primary)
    savePromises.push(saveToPinata(currentUserAddress, text));

    // 2. Save to OrbitDB (P2P)
    if (db) {
      savePromises.push(
        db.add({
          sender: currentUserAddress,
          content: text,
          timestamp
        }).catch((err: any) => {
          // Ignore NoPeers warning - message is still saved locally
          if (!err.message?.includes('NoPeersSubscribedToTopic')) {
            console.error('OrbitDB save error:', err);
          }
        })
      );
    }

    await Promise.allSettled(savePromises);
  }, [currentUserAddress, db, saveToPinata]);

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
                {/* Cloud backup indicator */}
                {isPinataConnected ? (
                  <span className="flex items-center gap-1 text-green-500" title="Cloud backup active">
                    <Cloud className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-500" title="Cloud backup unavailable">
                    <CloudOff className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatWindow
            messages={messages}
            currentUserAddress={currentUserAddress}
            partnerRole={partnerRole}
            status={status}
            error={ipfsError}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
}
