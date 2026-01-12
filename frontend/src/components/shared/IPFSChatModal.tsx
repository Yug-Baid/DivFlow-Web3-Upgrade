'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIPFS } from '@/contexts/IPFSContext';
import { ChatWindow, ChatMessage } from './ChatWindow';

interface IPFSChatModalProps {
  propertyId: string;
  inspectorAddress: string;
  revenueAddress: string;
  currentUserAddress: string;
  onClose: () => void;
  isChatDisabled?: boolean; // Optional, default false
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

  useEffect(() => {
    let mounted = true;
    let database: any;

    const initChat = async () => {
      if (!isReady) return;

      try {
        setStatus('connecting');
        database = await connectToChat(propertyId);
        
        if (!mounted) return;
        setDb(database);
        
        // Initial load
        await loadMessages(database);
        setStatus('synced');

        // Listen for replicated events (new messages from peers)
        database.events.on('update', async () => {
          if (mounted) await loadMessages(database);
        });

        // Listen for peer connection events (this depends on IPFS impl, often handled via libp2p events)
        // For OrbitDB, we might not get direct peer counts easily without probing libp2p
        // We'll trust 'synced' status for now.

      } catch (err) {
        console.error('Failed to connect to chat DB:', err);
        // Only set error if we couldn't get the DB, otherwise keep retrying/connecting
        if (!database) {
            setStatus('error');
        }
      }
    };

    initChat();

    return () => {
      mounted = false;
      if (database) {
        database.close().catch(console.error);
      }
    };

  }, [propertyId, isReady, connectToChat]);

  // Load locally saved messages immediately for offline support/instant feel
  useEffect(() => {
    const local = localStorage.getItem(`chat-${propertyId}`);
    if (local) {
        try {
            const parsed = JSON.parse(local);
            setMessages(parsed);
        } catch (e) {
            console.error("Failed to load local chat:", e);
        }
    }
  }, [propertyId]);

  // Persist messages to local storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
        localStorage.setItem(`chat-${propertyId}`, JSON.stringify(messages));
    }
  }, [messages, propertyId]);

  const loadMessages = async (database: any) => {
    try {
      // In OrbitDB feed/eventlog, we iterate to get items
      const all: any[] = [];
      for await (const doc of database.iterator({ limit: -1 })) {
        all.push(doc);
      }
      
      // Map OrbitDB entries to ChatMessage
      const mapped = all.filter(item => {
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

      // Merge with existing messages (deduplicate)
      setMessages(prev => {
          const combined = new Map();
          // Add previous messages first
          prev.forEach(m => combined.set(m.hash || `${m.timestamp}-${m.sender}`, m));
          // Add/Overwrite with network messages
          mapped.forEach(m => combined.set(m.hash, m));
          
          return Array.from(combined.values()).sort((a, b) => a.timestamp - b.timestamp);
      });

      scrollToBottom();
    } catch (e) {
      console.error('Error loading messages:', e);
    }
  };





  // Determine chat partner role
  const isInspector = currentUserAddress.toLowerCase() === inspectorAddress.toLowerCase();
  const partnerRole = isInspector ? 'Revenue Officer' : 'Land Inspector';
  const partnerAddress = isInspector ? revenueAddress : inspectorAddress;

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
                {status === 'synced' ? 'P2P Synced' : status === 'error' ? 'Connection Failed' : 'Connecting...'}
                {/* {peers > 0 && <span className="text-xs">({peers} peers)</span>} */}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10 hover:text-destructive">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content (Refactored to use ChatWindow) */}
        <div className="flex-1 flex flex-col min-h-0">
            <ChatWindow 
                messages={messages}
                currentUserAddress={currentUserAddress}
                partnerRole={partnerRole}
                status={status}
                error={ipfsError}
                onSendMessage={async (text) => {
                    if (!db) return;
                    try {
                        const msg = {
                            sender: currentUserAddress,
                            content: text,
                            timestamp: Date.now()
                        };
                        await db.add(msg);
                        await loadMessages(db);
                    } catch (err: any) {
                         // Fix for "NoPeers" warning
                         if (err.message && err.message.includes('NoPeersSubscribedToTopic')) {
                             // console.warn('Message saved locally (no peers subscribed yet):', err);
                             await loadMessages(db);
                             return;
                         }
                         throw err;
                    }
                }}
            />
        </div>
      </div>
    </div>
  );
}
