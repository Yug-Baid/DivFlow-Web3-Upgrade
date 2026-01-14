'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Loader2, MessageSquare, Send, Plus, ArrowLeft, Cloud, CloudOff, User, X, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { DashboardLayout } from '@/components/shared/DashboardLayout';

interface Message { id: string; sender: string; content: string; timestamp: number; }
interface ConversationPreview { partnerAddress: string; lastMessage: string; lastMessageTime: number; unreadCount: number; }

const getInboxKey = (address: string) => `divflow-inbox-${address.toLowerCase()}`;
const getConvKey = (a1: string, a2: string) => `divflow-conv-${[a1.toLowerCase(), a2.toLowerCase()].sort().join('-')}`;

export default function GlobalChatPage() {
    const { address, isConnected } = useAccount();
    const [conversations, setConversations] = useState<ConversationPreview[]>([]);
    const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isPinataConnected, setIsPinataConnected] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatAddress, setNewChatAddress] = useState('');
    const [addressError, setAddressError] = useState('');
    const [syncing, setSyncing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const scrollToBottom = useCallback(() => { setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }, []);
    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    const loadLocalInbox = useCallback((): ConversationPreview[] => {
        if (!address) return [];
        try { return JSON.parse(localStorage.getItem(getInboxKey(address)) || '[]'); } catch { return []; }
    }, [address]);

    const saveLocalInbox = useCallback((convs: ConversationPreview[]) => {
        if (!address) return;
        try { localStorage.setItem(getInboxKey(address), JSON.stringify(convs)); } catch { }
    }, [address]);

    const loadLocalMessages = useCallback((partner: string): Message[] => {
        if (!address) return [];
        try { return JSON.parse(localStorage.getItem(getConvKey(address, partner)) || '[]'); } catch { return []; }
    }, [address]);

    const saveLocalMessages = useCallback((partner: string, msgs: Message[]) => {
        if (!address) return;
        try { localStorage.setItem(getConvKey(address, partner), JSON.stringify(msgs)); } catch { }
    }, [address]);

    // Deduplicate messages helper
    const deduplicateMessages = (msgs: Message[]): Message[] => {
        const seen = new Set<string>();
        const result: Message[] = [];
        msgs.forEach(m => {
            // Create key by sender + content + timestamp window (10 seconds)
            const key = `${m.sender}-${m.content}-${Math.floor(m.timestamp / 10000)}`;
            if (!seen.has(key)) {
                seen.add(key);
                result.push(m);
            }
        });
        return result.sort((a, b) => a.timestamp - b.timestamp);
    };

    const syncWithPinata = useCallback(async () => {
        if (!address) return;
        try {
            setSyncing(true);
            const response = await fetch(`/api/chat/inbox?address=${address}`);
            const data = await response.json();
            if (data.success && data.conversations) {
                setIsPinataConnected(true);
                const local = loadLocalInbox();
                const merged = [...local];
                data.conversations.forEach((remote: ConversationPreview) => {
                    const idx = merged.findIndex(l => l.partnerAddress.toLowerCase() === remote.partnerAddress.toLowerCase());
                    if (idx >= 0) { if (remote.lastMessageTime > merged[idx].lastMessageTime) merged[idx] = remote; }
                    else { merged.push(remote); }
                });
                merged.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
                setConversations(merged);
                saveLocalInbox(merged);
            }
        } catch { setIsPinataConnected(false); }
        finally { setSyncing(false); }
    }, [address, loadLocalInbox, saveLocalInbox]);

    useEffect(() => {
        if (address) { setLoading(true); setConversations(loadLocalInbox()); setLoading(false); syncWithPinata(); }
    }, [address, loadLocalInbox, syncWithPinata]);

    useEffect(() => {
        if (selectedPartner && address) {
            const local = loadLocalMessages(selectedPartner);
            setMessages(deduplicateMessages(local));

            // Mark as read
            setConversations(prev => {
                const updated = prev.map(c => c.partnerAddress.toLowerCase() === selectedPartner.toLowerCase() ? { ...c, unreadCount: 0 } : c);
                saveLocalInbox(updated);
                return updated;
            });

            // Sync from Pinata
            (async () => {
                try {
                    const response = await fetch(`/api/chat/dm?user=${address}&partner=${selectedPartner}`);
                    const data = await response.json();
                    if (data.success && data.messages) {
                        setIsPinataConnected(true);
                        const merged = deduplicateMessages([...local, ...data.messages]);
                        setMessages(merged);
                        saveLocalMessages(selectedPartner, merged);
                    }
                } catch { }
            })();
        }
    }, [selectedPartner, address, loadLocalMessages, saveLocalMessages, saveLocalInbox]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !address || !selectedPartner || sending) return;

        const msgContent = newMessage.trim();
        const timestamp = Date.now();
        const newMsg: Message = { id: `${timestamp}-${address.slice(2, 10)}`, sender: address.toLowerCase(), content: msgContent, timestamp };

        setNewMessage('');
        setSending(true);

        const updatedMessages = deduplicateMessages([...messages, newMsg]);
        setMessages(updatedMessages);
        saveLocalMessages(selectedPartner, updatedMessages);

        let updatedConvs = conversations.map(c => c.partnerAddress.toLowerCase() === selectedPartner.toLowerCase() ? { ...c, lastMessage: msgContent, lastMessageTime: timestamp } : c);
        if (!updatedConvs.find(c => c.partnerAddress.toLowerCase() === selectedPartner.toLowerCase())) {
            updatedConvs.unshift({ partnerAddress: selectedPartner.toLowerCase(), lastMessage: msgContent, lastMessageTime: timestamp, unreadCount: 0 });
        }
        updatedConvs.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        setConversations(updatedConvs);
        saveLocalInbox(updatedConvs);

        try {
            await fetch('/api/chat/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: address, recipient: selectedPartner, content: msgContent }) });
            await Promise.all([
                fetch('/api/chat/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, action: 'addOrUpdate', partnerAddress: selectedPartner, lastMessage: msgContent, lastMessageTime: timestamp, isSender: true }) }),
                fetch('/api/chat/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: selectedPartner, action: 'addOrUpdate', partnerAddress: address, lastMessage: msgContent, lastMessageTime: timestamp, isSender: false }) })
            ]);
            setIsPinataConnected(true);
        } catch { }
        setSending(false);
    };

    const handleStartNewChat = () => {
        if (!newChatAddress.trim()) { setAddressError('Enter wallet address'); return; }
        if (!/^0x[a-fA-F0-9]{40}$/.test(newChatAddress)) { setAddressError('Invalid address'); return; }
        if (newChatAddress.toLowerCase() === address?.toLowerCase()) { setAddressError('Cannot chat with yourself'); return; }
        const partnerAddr = newChatAddress.toLowerCase();
        setSelectedPartner(partnerAddr);
        setShowNewChatModal(false);
        setNewChatAddress('');
        setAddressError('');
        if (!conversations.find(c => c.partnerAddress.toLowerCase() === partnerAddr)) {
            const updated = [{ partnerAddress: partnerAddr, lastMessage: '', lastMessageTime: Date.now(), unreadCount: 0 }, ...conversations];
            setConversations(updated);
            saveLocalInbox(updated);
        }
    };

    if (!isConnected || !address) {
        return (<DashboardLayout><div className="flex items-center justify-center min-h-[60vh]"><GlassCard className="max-w-md w-full p-8 text-center"><MessageSquare className="w-16 h-16 mx-auto mb-4 text-primary/50" /><h1 className="text-2xl font-bold mb-2">Global Chat</h1><p className="text-muted-foreground">Connect wallet to access messaging.</p></GlassCard></div></DashboardLayout>);
    }

    return (
        <DashboardLayout>
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="w-6 h-6 text-primary" />Global Chat</h1>
                    <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                        Direct messaging with any wallet
                        {isPinataConnected ? <span className="inline-flex items-center gap-1 text-green-500"><Cloud className="w-3 h-3" /> Cloud Synced</span> : <span className="inline-flex items-center gap-1 text-yellow-500"><CloudOff className="w-3 h-3" /> Local Only</span>}
                        {syncing && <Loader2 className="w-3 h-3 animate-spin" />}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={syncWithPinata} disabled={syncing}><RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /></Button>
                    <Button onClick={() => setShowNewChatModal(true)} className="gap-2"><Plus className="w-4 h-4" />New Chat</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)] min-h-[500px]">
                <GlassCard className="lg:col-span-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-border"><h2 className="font-semibold text-sm text-muted-foreground uppercase">Conversations ({conversations.length})</h2></div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
                            conversations.length === 0 ? <div className="text-center py-10 px-4"><MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">No conversations</p></div> :
                                <div className="divide-y divide-border">
                                    {conversations.map((conv) => (
                                        <button key={conv.partnerAddress} onClick={() => setSelectedPartner(conv.partnerAddress)} className={`w-full p-4 text-left hover:bg-secondary/50 ${selectedPartner === conv.partnerAddress ? 'bg-primary/10 border-l-2 border-primary' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center relative">
                                                    <User className="w-5 h-5 text-muted-foreground" />
                                                    {conv.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>}
                                                </div>
                                                <div className="flex-1 min-w-0"><p className="font-mono text-sm font-medium truncate">{formatAddress(conv.partnerAddress)}</p><p className="text-xs text-muted-foreground truncate">{conv.lastMessage || 'Start conversation'}</p></div>
                                            </div>
                                        </button>
                                    ))}
                                </div>}
                    </div>
                </GlassCard>

                <GlassCard className="lg:col-span-2 flex flex-col overflow-hidden">
                    {!selectedPartner ? <div className="flex-1 flex items-center justify-center"><div className="text-center"><MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" /><p className="text-muted-foreground">Select a conversation</p></div></div> : <>
                        <div className="p-4 border-b border-border flex items-center gap-3">
                            <button onClick={() => setSelectedPartner(null)} className="lg:hidden p-2 hover:bg-secondary rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                            <div className="flex-1"><p className="font-mono font-medium">{formatAddress(selectedPartner)}</p><p className="text-xs text-muted-foreground">{messages.length} messages</p></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/5">
                            {messages.length === 0 ? <div className="text-center py-10"><p className="text-sm text-muted-foreground">No messages yet. Say hi! 👋</p></div> :
                                messages.map((msg) => {
                                    const isMe = msg.sender.toLowerCase() === address?.toLowerCase();
                                    return <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary border border-border rounded-bl-none'}`}>
                                            <p className="text-sm">{msg.content}</p>
                                            <p className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isMe && <Check className="w-3 h-3" />}
                                            </p>
                                        </div>
                                    </div>;
                                })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 border-t border-border bg-background/50">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-secondary/50 border-input border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" disabled={sending} />
                                <Button type="submit" disabled={!newMessage.trim() || sending}>{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
                            </form>
                        </div>
                    </>}
                </GlassCard>
            </div>

            {showNewChatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-4 border-b border-border flex items-center justify-between"><h3 className="font-semibold">Start New Chat</h3><button onClick={() => { setShowNewChatModal(false); setNewChatAddress(''); setAddressError(''); }} className="p-2 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button></div>
                        <div className="p-4">
                            <label className="block text-sm font-medium mb-2">Wallet Address</label>
                            <input type="text" value={newChatAddress} onChange={(e) => { setNewChatAddress(e.target.value); setAddressError(''); }} placeholder="0x..." className={`w-full bg-secondary/50 border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary ${addressError ? 'border-red-500' : 'border-input'}`} onKeyDown={(e) => e.key === 'Enter' && handleStartNewChat()} />
                            {addressError && <p className="text-red-500 text-xs mt-2">{addressError}</p>}
                        </div>
                        <div className="p-4 border-t border-border flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => { setShowNewChatModal(false); setNewChatAddress(''); setAddressError(''); }}>Cancel</Button>
                            <Button className="flex-1" onClick={handleStartNewChat}>Start Chat</Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
