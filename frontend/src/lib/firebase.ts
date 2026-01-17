import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, onValue, query, orderByChild, limitToLast, off, get, remove } from 'firebase/database';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

export interface ChatMessage {
  id?: string;
  sender: string;
  content: string;
  timestamp: number;
}

/**
 * Send a message to a property chat
 */
export async function sendMessage(propertyId: string, sender: string, content: string): Promise<void> {
  const messagesRef = ref(database, `chats/${propertyId}/messages`);
  await push(messagesRef, {
    sender,
    content,
    timestamp: Date.now(),
  });
}

/**
 * Subscribe to messages for a property chat
 * Returns an unsubscribe function
 */
export function subscribeToMessages(
  propertyId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesRef = ref(database, `chats/${propertyId}/messages`);
  const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));

  const handleValue = (snapshot: any) => {
    const messages: ChatMessage[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child: any) => {
        messages.push({
          id: child.key,
          ...child.val(),
        });
      });
    }
    // Sort by timestamp (ascending)
    messages.sort((a, b) => a.timestamp - b.timestamp);
    callback(messages);
  };

  onValue(messagesQuery, handleValue);

  // Return unsubscribe function
  return () => off(messagesQuery, 'value', handleValue);
}

/**
 * Set chat participants (for reference)
 */
export async function setChatParticipants(
  propertyId: string,
  inspector: string,
  revenue: string
): Promise<void> {
  const participantsRef = ref(database, `chats/${propertyId}/participants`);
  await push(participantsRef, { inspector, revenue });
}

/**
 * Send a message request notification to inform recipient of a new conversation
 * This allows users to discover messages from contacts they haven't added
 */
export async function sendMessageRequest(
  targetAddress: string,
  senderAddress: string
): Promise<void> {
  const requestsRef = ref(database, `message-requests/${targetAddress.toLowerCase()}`);
  // Check if request already exists to avoid duplicates
  await push(requestsRef, {
    from: senderAddress,
    timestamp: Date.now(),
  });
}

/**
 * Subscribe to message requests for a user
 * Returns an unsubscribe function
 */
export function subscribeToMessageRequests(
  userAddress: string,
  callback: (requests: { from: string; timestamp: number }[]) => void
): () => void {
  const requestsRef = ref(database, `message-requests/${userAddress.toLowerCase()}`);
  const requestsQuery = query(requestsRef, orderByChild('timestamp'), limitToLast(50));

  const handleValue = (snapshot: any) => {
    const requests: { from: string; timestamp: number }[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child: any) => {
        const val = child.val();
        requests.push({
          from: val.from,
          timestamp: val.timestamp,
        });
      });
    }
    // Get unique senders (latest request per sender)
    const uniqueSenders = new Map<string, number>();
    requests.forEach(r => {
      const key = r.from.toLowerCase();
      if (!uniqueSenders.has(key) || uniqueSenders.get(key)! < r.timestamp) {
        uniqueSenders.set(key, r.timestamp);
      }
    });
    const uniqueRequests = Array.from(uniqueSenders.entries()).map(([from, timestamp]) => ({ from, timestamp }));
    callback(uniqueRequests);
  };

  onValue(requestsQuery, handleValue);

  return () => off(requestsQuery, 'value', handleValue);
}

/**
 * Clear all message requests from a specific sender after accepting
 * This prevents duplicate accept buttons from appearing
 */
export async function clearMessageRequestsFrom(
  userAddress: string,
  senderAddress: string
): Promise<void> {
  const requestsRef = ref(database, `message-requests/${userAddress.toLowerCase()}`);
  
  try {
    const snapshot = await get(requestsRef);
    if (snapshot.exists()) {
      const updates: Promise<void>[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        if (val.from && val.from.toLowerCase() === senderAddress.toLowerCase()) {
          // Remove this request
          updates.push(remove(ref(database, `message-requests/${userAddress.toLowerCase()}/${child.key}`)));
        }
      });
      await Promise.all(updates);
    }
  } catch (error) {
    console.error('Failed to clear message requests:', error);
  }
}

export { database };
