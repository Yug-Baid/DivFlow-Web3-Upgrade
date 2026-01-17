"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { subscribeToMessages, subscribeToMessageRequests } from "@/lib/firebase";

/**
 * Custom hook to track unread messages in global chat
 * Returns true if there are any unread messages
 */
export function useGlobalChatUnread() {
    const { address } = useAccount();
    const [hasUnread, setHasUnread] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!address) {
            setHasUnread(false);
            setUnreadCount(0);
            return;
        }

        // Load contacts from localStorage
        const stored = localStorage.getItem(`divflow-contacts-${address.toLowerCase()}`);
        const contacts: string[] = stored ? JSON.parse(stored) : [];

        // Load last seen counts
        const seenData = localStorage.getItem(`divflow-lastseen-${address.toLowerCase()}`);
        const lastSeenCounts: Record<string, number> = seenData ? JSON.parse(seenData) : {};

        const unsubscribers: (() => void)[] = [];
        let totalUnread = 0;

        // Helper to get DM ID
        const getDmId = (addr1: string, addr2: string) => {
            const [a, b] = [addr1.toLowerCase(), addr2.toLowerCase()].sort();
            return `dm-${a}-${b}`;
        };

        // Subscribe to message requests (new contacts trying to reach you)
        const unsubRequests = subscribeToMessageRequests(address, (requests) => {
            const newRequests = requests
                .map(r => r.from)
                .filter(from => !contacts.includes(from) && from.toLowerCase() !== address.toLowerCase());
            
            if (newRequests.length > 0) {
                setHasUnread(true);
                setUnreadCount(prev => Math.max(prev, newRequests.length));
            }
        });
        unsubscribers.push(unsubRequests);

        // Subscribe to each contact's messages
        contacts.forEach(contact => {
            const dmId = getDmId(address, contact);
            const lastSeen = lastSeenCounts[contact] || 0;

            const unsubscribe = subscribeToMessages(dmId, (messages) => {
                const currentCount = messages.length;

                if (currentCount > lastSeen) {
                    // Check if latest message is not from current user
                    const latestMsg = messages[messages.length - 1];
                    if (latestMsg && latestMsg.sender.toLowerCase() !== address.toLowerCase()) {
                        totalUnread++;
                        setHasUnread(true);
                        setUnreadCount(totalUnread);
                    }
                }
            });

            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [address]);

    // Function to clear the unread state (called when user opens chat page)
    const clearUnread = useCallback(() => {
        setHasUnread(false);
        setUnreadCount(0);
    }, []);

    return { hasUnread, unreadCount, clearUnread };
}
