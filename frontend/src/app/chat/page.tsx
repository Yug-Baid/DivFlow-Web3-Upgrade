"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { ChatWindow, ChatMessage } from "@/components/shared/ChatWindow";
import { sendMessage as firebaseSendMessage, subscribeToMessages, sendMessageRequest, subscribeToMessageRequests, clearMessageRequestsFrom } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MessageSquare, Hash, Zap, UserPlus } from "lucide-react";

export default function GlobalChatPage() {
    const { address } = useAccount();

    // UI State
    const [activeContact, setActiveContact] = useState<string | null>(null);
    const [contacts, setContacts] = useState<string[]>([]);
    const [newContactInput, setNewContactInput] = useState("");

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [status, setStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');
    const [unread, setUnread] = useState<string[]>([]);
    const [pendingRequests, setPendingRequests] = useState<string[]>([]);
    
    // Track last seen message count per contact to detect new messages
    const lastSeenCountRef = useRef<Record<string, number>>({});

    // Load contacts from localStorage
    useEffect(() => {
        if (!address) return;
        const stored = localStorage.getItem(`divflow-contacts-${address.toLowerCase()}`);
        if (stored) {
            setContacts(JSON.parse(stored));
        } else {
            setContacts([]);
        }
        // Load last seen counts
        const seenData = localStorage.getItem(`divflow-lastseen-${address.toLowerCase()}`);
        if (seenData) {
            lastSeenCountRef.current = JSON.parse(seenData);
        }
    }, [address]);

    // Subscribe to message requests (discover new contacts who messaged you)
    useEffect(() => {
        if (!address) return;

        const unsubscribe = subscribeToMessageRequests(address, (requests) => {
            // Filter out contacts we already have (case-insensitive check)
            const existingContactsLower = contacts.map(c => c.toLowerCase());
            const newRequests = requests
                .map(r => r.from)
                .filter(from => {
                    const fromLower = from.toLowerCase();
                    // Must NOT be in existing contacts AND must NOT be self
                    return !existingContactsLower.includes(fromLower) && fromLower !== address.toLowerCase();
                });
            setPendingRequests(newRequests);
        });

        return () => unsubscribe();
    }, [address, contacts]);

    // Helper to get consistent DM ID
    const getDmId = (addr1: string, addr2: string) => {
        const [a, b] = [addr1.toLowerCase(), addr2.toLowerCase()].sort();
        return `dm-${a}-${b}`;
    };

    // Subscribe to ALL contacts for new message detection (background)
    useEffect(() => {
        if (!address || contacts.length === 0) return;

        const unsubscribers: (() => void)[] = [];

        contacts.forEach(contact => {
            const dmId = getDmId(address, contact);
            
            const unsubscribe = subscribeToMessages(dmId, (newMessages) => {
                const currentCount = newMessages.length;
                const lastSeen = lastSeenCountRef.current[contact] || 0;
                
                // Check if there are new messages from this contact (not currently active)
                if (currentCount > lastSeen && contact !== activeContact) {
                    // Check if the latest message is not from current user
                    const latestMsg = newMessages[newMessages.length - 1];
                    if (latestMsg && latestMsg.sender.toLowerCase() !== address.toLowerCase()) {
                        setUnread(prev => {
                            if (!prev.includes(contact)) {
                                return [...prev, contact];
                            }
                            return prev;
                        });
                    }
                }
            });
            
            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [address, contacts, activeContact]);

    // Firebase Chat Subscription for active contact
    useEffect(() => {
        if (!address || !activeContact) {
            setMessages([]);
            return;
        }

        const dmId = getDmId(address, activeContact);
        setStatus('connecting');

        // Subscribe to Firebase messages
        const unsubscribe = subscribeToMessages(dmId, (newMessages) => {
            const mapped = newMessages.map(m => ({
                hash: m.id || `${m.timestamp}-${m.sender}`,
                sender: m.sender,
                content: m.content,
                timestamp: m.timestamp,
            }));
            setMessages(mapped);
            setStatus('synced');
            
            // Update last seen count for active contact
            lastSeenCountRef.current[activeContact] = newMessages.length;
            if (address) {
                localStorage.setItem(
                    `divflow-lastseen-${address.toLowerCase()}`,
                    JSON.stringify(lastSeenCountRef.current)
                );
            }
        });

        return () => {
            unsubscribe();
        };
    }, [address, activeContact]);

    const addContact = useCallback((contactStr?: string) => {
        const target = contactStr || newContactInput.trim();
        if (!target || !address) return;

        // Basic eth address validation
        if (!target.startsWith('0x') || target.length !== 42) {
            alert('Please enter a valid Ethereum address');
            return;
        }

        if (!contacts.includes(target)) {
            const updated = [...contacts, target];
            setContacts(updated);
            localStorage.setItem(`divflow-contacts-${address.toLowerCase()}`, JSON.stringify(updated));
        }

        setNewContactInput("");
        setActiveContact(target);
    }, [address, contacts, newContactInput]);

    const selectContact = (contact: string) => {
        setActiveContact(contact);
        // Clear unread
        setUnread(prev => prev.filter(c => c !== contact));
    };

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !address || !activeContact) return;

        const dmId = getDmId(address, activeContact);
        
        try {
            await firebaseSendMessage(dmId, address, text);
            // Send a message request so recipient can discover this conversation
            await sendMessageRequest(activeContact, address);
        } catch (e) {
            console.error("Failed to send message:", e);
            throw e;
        }
    }, [address, activeContact]);

    // Accept a message request and add to contacts
    const acceptRequest = useCallback(async (from: string) => {
        if (!address) return;
        
        if (!contacts.includes(from)) {
            const updated = [...contacts, from];
            setContacts(updated);
            localStorage.setItem(`divflow-contacts-${address.toLowerCase()}`, JSON.stringify(updated));
        }
        
        // Remove from pending UI
        setPendingRequests(prev => prev.filter(r => r.toLowerCase() !== from.toLowerCase()));
        
        // Remove from Firebase to prevent reappearance
        try {
            await clearMessageRequestsFrom(address, from);
        } catch (e) {
            console.error("Failed to clear message request:", e);
        }

        setActiveContact(from);
    }, [address, contacts]);

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-120px)]">

                {/* Sidebar */}
                <GlassCard className="w-full md:w-80 flex flex-col p-4 border-r border-white/10">
                    <div className="mb-6 space-y-4">

                        {/* Status Header */}
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-sm flex items-center gap-2">
                                <Zap className="w-4 h-4 text-orange-500" />
                                Global Chat
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="text-xs flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${status === 'synced' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                                    <span className="text-muted-foreground">{status === 'synced' ? 'Connected' : 'Connecting...'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Add Contact */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="0x... Address"
                                className="h-8 text-xs font-mono"
                                value={newContactInput}
                                onChange={(e) => setNewContactInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addContact()}
                            />
                            <Button size="sm" className="h-8 w-8 p-0 bg-orange-500 hover:bg-orange-600" onClick={() => addContact()}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Pending Message Requests */}
                    {pendingRequests.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    <UserPlus className="w-3 h-3" />
                                    New Messages
                                </span>
                                <span className="bg-orange-500 text-white text-[10px] px-1.5 rounded-full">{pendingRequests.length}</span>
                            </h3>
                            <div className="space-y-2">
                                {pendingRequests.map(req => (
                                    <div key={req} className="flex items-center justify-between p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg text-xs animate-pulse">
                                        <span className="font-mono truncate w-24">{req.slice(0, 6)}...{req.slice(-4)}</span>
                                        <Button size="sm" className="h-6 text-[10px] bg-orange-500 hover:bg-orange-600" onClick={() => acceptRequest(req)}>Accept</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Contacts List */}
                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                        {contacts.length === 0 && pendingRequests.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">
                                No contacts yet.<br/>Add an address to start chatting.
                            </p>
                        )}

                        {contacts.map(contact => (
                            <button
                                key={contact}
                                onClick={() => selectContact(contact)}
                                className={`w-full p-3 rounded-xl text-left transition-colors flex items-center gap-3 relative
                                    ${activeContact === contact ? 'bg-orange-500/20 border border-orange-500/50' : 'hover:bg-white/5 border border-transparent'}
                                `}
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                                    <Hash className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium font-mono truncate">{contact.slice(0, 6)}...{contact.slice(-4)}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        {activeContact === contact ? 'Active' : 'Click to chat'}
                                    </p>
                                </div>

                                {/* Red Dot for Unread */}
                                {unread.includes(contact) && (
                                    <span className="absolute right-2 top-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                )}
                            </button>
                        ))}
                    </div>
                </GlassCard>

                {/* Main Chat Window */}
                <div className="flex-1 min-w-0 h-full">
                    {activeContact ? (
                        <ChatWindow
                            messages={messages}
                            currentUserAddress={address || ''}
                            onSendMessage={handleSendMessage}
                            status={status}
                            isLoading={status === 'connecting'}
                            error={status === 'error' ? "Connection Failed" : null}
                            placeholder={`Message ${activeContact?.slice(0, 6)}...`}
                        />
                    ) : (
                        <GlassCard className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                            <p>Select a contact to start messaging</p>
                            <p className="text-xs mt-2 opacity-50">Messages sync instantly via Firebase</p>
                        </GlassCard>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
