"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { ChatWindow, ChatMessage } from "@/components/shared/ChatWindow";
import { useIPFS } from "@/contexts/IPFSContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MessageSquare, Hash } from "lucide-react";

export default function GlobalChatPage() {
    const { address } = useAccount();
    const { ipfs, orbitdb, isReady, error: ipfsError, broadcastAnnouncement, reconnect } = useIPFS();

    // UI State
    const [activeContact, setActiveContact] = useState<string | null>(null);
    const [contacts, setContacts] = useState<string[]>([]);
    const [pendingRequests, setPendingRequests] = useState<string[]>([]);
    const [newContactInput, setNewContactInput] = useState("");

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [database, setDatabase] = useState<any>(null);
    const [status, setStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');
    const [unread, setUnread] = useState<string[]>([]);
    const [peerCount, setPeerCount] = useState(0);

    // DISCOVERY: Persistent Global Event Log
    const [discoveryDb, setDiscoveryDb] = useState<any>(null);

    // Poll for Peer Count
    useEffect(() => {
        if (!ipfs || !ipfs.libp2p) return;
        const interval = setInterval(() => {
            const peers = ipfs.libp2p.getConnections();
            setPeerCount(peers.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [ipfs]);

    // Load contacts & Sync
    useEffect(() => {
        if (!address) return;
        const stored = localStorage.getItem(`divflow-contacts-${address.toLowerCase()}`);
        if (stored) {
            setContacts(JSON.parse(stored));
        } else {
            setContacts([]);
        }
    }, [address]);

    // DISCOVERY INIT
    useEffect(() => {
        if (!orbitdb || !address) return;

        const initDiscovery = async () => {
            try {
                // Open Global Discovery DB (Public Write)
                const db = await orbitdb.open('divflow-global-discovery-v1', {
                    type: 'events',
                    accessController: { write: ['*'] }
                });
                setDiscoveryDb(db);
                console.log("Global Discovery DB Opened:", db.address.toString());

                // Helper to process pings
                const processPing = (entry: any) => {
                    const val = entry.payload?.value || entry.value;
                    if (!val) return;

                    // Check if it's for ME
                    if (val.to?.toLowerCase() === address.toLowerCase()) {
                        const sender = val.from;
                        console.log("Found Message Request from:", sender);

                        if (activeContact?.toLowerCase() === sender?.toLowerCase()) return;

                        setContacts(current => {
                            if (current.includes(sender)) {
                                setUnread(prev => {
                                    if (prev.includes(sender)) return prev;
                                    return [...prev, sender];
                                });
                                return current;
                            }
                            setPendingRequests(prev => {
                                if (prev.includes(sender)) return prev;
                                return [...prev, sender];
                            });
                            return current;
                        });
                    }
                };

                // 1. Load existing history
                for await (const entry of db.iterator({ limit: -1 })) {
                    processPing(entry);
                }

                // 2. Listen for new pings (Replication)
                db.events.on('replicated', async () => {
                    console.log("Discovery DB Replicated - Checking for new pings...");
                    for await (const entry of db.iterator({ limit: 5 })) { // Check recent
                        processPing(entry);
                    }
                });

            } catch (e) {
                console.error("Discovery Init Failed:", e);
            }
        };

        initDiscovery();
    }, [orbitdb, address, activeContact]);

    // Send Ping Helper
    const sendPing = async (target: string) => {
        if (!discoveryDb || !address) return;
        try {
            console.log("Sending Discovery Ping to:", target);
            await discoveryDb.add({
                from: address,
                to: target,
                timestamp: Date.now(),
                type: 'ping'
            });
        } catch (e: any) {
            if (e.message?.includes('NoPeersSubscribedToTopic')) {
                console.warn("Discovery Ping saved locally (Offline).");
                return;
            }
            console.error("Failed to send ping:", e);
        }
    };

    // CHAT DB CONNECTION
    const [dmId, setDmId] = useState<string | null>(null);

    // Helper to get consistent DM ID
    const getDmId = (addr1: string, addr2: string) => {
        const [a, b] = [addr1.toLowerCase(), addr2.toLowerCase()].sort();
        return `divflow-dm-${a}-${b}`;
    };

    useEffect(() => {
        if (!orbitdb || !address || !activeContact) {
            setDatabase(null);
            setMessages([]);
            return;
        }

        const id = getDmId(address, activeContact);
        setDmId(id);
        setStatus('connecting');

        // Optimistic Load from LocalStorage
        const localKey = `chat-history-${id}`;
        try {
            const cached = localStorage.getItem(localKey);
            if (cached) {
                setMessages(JSON.parse(cached));
                setStatus('synced'); // At least we have local data
            } else {
                setMessages([]);
            }
        } catch (e) {
            console.error("Local load error", e);
        }

        let isMounted = true;

        const connect = async () => {
            try {
                // Timeout promise to prevent infinite hanging
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Connection timeout")), 15000)
                );

                const openDbPromise = orbitdb.open(id, {
                    type: 'events',
                    accessController: { write: ['*'] } // Public write for now to allow DM
                });

                const db = await Promise.race([openDbPromise, timeoutPromise]) as any;

                if (!isMounted) return;

                setDatabase(db);
                setStatus('synced');
                console.log(`Connected to DM: ${id}`);

                const loadMessages = async () => {
                    try {
                        const loaded: any[] = [];
                        try {
                            for await (const entry of db.iterator({ limit: 50 })) {
                                const val = entry.payload.value;
                                loaded.unshift({
                                    hash: entry.hash,
                                    sender: val.sender,
                                    content: val.content,
                                    timestamp: val.timestamp,
                                    isMe: val.sender.toLowerCase() === address.toLowerCase()
                                });
                            }
                        } catch (iterErr) {
                            console.warn("Corrupt entry skipped:", iterErr);
                        }

                        if (isMounted) {
                            setMessages(current => {
                                // 1. If remote is empty (MemoryStore reset), keep local history
                                if (loaded.length === 0 && current.length > 0) {
                                    return current;
                                }

                                // 2. If remote has data, merge with local to avoid duplicates
                                // Map by hash or timestamp+sender+content collision check
                                const existingHashes = new Set(current.map(m => m.hash || `${m.timestamp}-${m.sender}-${m.content}`));
                                const merged = [...current];

                                loaded.forEach(msg => {
                                    const key = msg.hash || `${msg.timestamp}-${msg.sender}-${msg.content}`;
                                    if (!existingHashes.has(key)) {
                                        merged.push(msg);
                                        existingHashes.add(key);
                                    }
                                });

                                // Sort by timestamp
                                return merged.sort((a, b) => a.timestamp - b.timestamp);
                            });
                        }
                    } catch (e) {
                        console.error("Load messages error:", e);
                    }
                };

                await loadMessages();

                db.events.on('replicated', async () => {
                    await loadMessages();
                });

                // ALSO: Listen for 'write' events (my own writes from other tabs)
                db.events.on('write', async () => {
                    await loadMessages();
                });

            } catch (e) {
                console.error("Chat Connection Failed:", e);
                if (isMounted) setStatus('error');
            }
        };

        if (isReady) {
            connect();
        } else {
            console.log("Waiting for IPFS to be ready...");
        }

        return () => {
            isMounted = false;
        };

    }, [orbitdb, address, activeContact, isReady]);

    // Persist Messages to LocalStorage
    useEffect(() => {
        if (dmId && messages.length > 0) {
            localStorage.setItem(`chat-history-${dmId}`, JSON.stringify(messages));
        }
    }, [messages, dmId]);


    const addContact = async (contactStr?: string) => {
        const target = contactStr || newContactInput.trim();
        if (!target) return;

        // Basic eth address validation could go here

        if (!contacts.includes(target)) {
            const updated = [...contacts, target];
            setContacts(updated);
            localStorage.setItem(`divflow-contacts-${address?.toLowerCase()}`, JSON.stringify(updated));
        }

        // Remove from pending if there
        if (pendingRequests.includes(target)) {
            setPendingRequests(prev => prev.filter(c => c !== target));
        }

        setNewContactInput("");
        setActiveContact(target);

        // Send initial ping
        await sendPing(target);
    };

    const selectContact = (contact: string) => {
        setActiveContact(contact);
        // Clear unread
        setUnread(prev => prev.filter(c => c !== contact));
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || !database) return;

        try {
            const msg = {
                sender: address,
                content: text,
                timestamp: Date.now()
            };

            // 1. Add to local OrbitDB (This persists locally)
            try {
                await database.add(msg);
            } catch (e: any) {
                // Ignore "No peers" error - we are offline but local write succeeded
                if (!e.message?.includes('NoPeersSubscribedToTopic')) {
                    throw e; // Rethrow real errors
                }
                console.warn("Offline Send: Message saved locally, waiting for sync.");
            }

            // 2. Send Discovery Ping (Best Effort)
            try {
                if (activeContact) await sendPing(activeContact);
            } catch (e) {
                console.warn("Ping failed (likely offline):", e);
            }

            // 3. Optimistic Update UI
            const newMsg = {
                hash: `temp-${Date.now()}`,
                sender: address,
                content: text,
                timestamp: Date.now(),
                isMe: true
            };
            // @ts-ignore
            setMessages(prev => [...prev, newMsg]);

        } catch (e) {
            console.error("Critical Send Error", e);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-120px)]">

                {/* Sidebar */}
                <GlassCard className="w-full md:w-80 flex flex-col p-4 border-r border-white/10">
                    <div className="mb-6 space-y-4">

                        {/* Status Header */}
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-sm">Global Chat</h2>
                            <div className="flex items-center gap-2">
                                <div className="text-xs flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${(!isReady) ? 'bg-orange-500 animate-pulse' : status === 'synced' ? 'bg-green-500' : 'bg-yellow-500'}`} />
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
                            />
                            <Button size="sm" className="h-8 w-8 p-0 bg-orange-500 hover:bg-orange-600" onClick={() => addContact()}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Pending Requests */}
                    {pendingRequests.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                                New Requests
                                <span className="bg-orange-500 text-white text-[10px] px-1.5 rounded-full">{pendingRequests.length}</span>
                            </h3>
                            <div className="space-y-2">
                                {pendingRequests.map(req => (
                                    <div key={req} className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-xs">
                                        <span className="font-mono truncate w-24">{req.slice(0, 6)}...{req.slice(-4)}</span>
                                        <Button size="sm" className="h-6 text-[10px]" onClick={() => addContact(req)}>Accept</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Contacts List */}
                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                        {contacts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No contacts yet.</p>}

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

                                {/* Red Dot for Unread from Existing Contacts */}
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
                            onSendMessage={sendMessage}
                            status={status}
                            isLoading={status === 'connecting' || !isReady}
                            error={status === 'error' ? "Connection Failed" : null}
                            placeholder={`Message ${activeContact?.slice(0, 6)}...`}
                        />
                    ) : (
                        <GlassCard className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                            <p>Select a contact to start messaging</p>
                            <p className="text-xs mt-2 opacity-50">Messages are end-to-end encrypted via OrbitDB</p>
                        </GlassCard>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
