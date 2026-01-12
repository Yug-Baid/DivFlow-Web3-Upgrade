'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';


// Define context shape
interface IPFSContextType {
    ipfs: any; // Helia instance
    orbitdb: any; // OrbitDB instance
    isReady: boolean;
    error: string | null;
    connectToChat: (propertyId: string) => Promise<any>;
    broadcastAnnouncement: (message: any) => Promise<void>;
    reconnect: () => Promise<void>;
}

const IPFSContext = createContext<IPFSContextType>({
    ipfs: null,
    orbitdb: null,
    isReady: false,
    error: null,
    connectToChat: async () => null,
    broadcastAnnouncement: async () => { },
    reconnect: async () => { }
});

export const useIPFS = () => useContext(IPFSContext);

export const IPFSProvider = ({ children }: { children: React.ReactNode }) => {
    const [ipfs, setIpfs] = useState<any>(null);
    const [orbitdb, setOrbitdb] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Tracking mounted state via ref to avoid closure staleness/ReferenceErrors
    const isMounted = React.useRef(false);



    useEffect(() => {
        isMounted.current = true;

        const cleanup = () => {
            isMounted.current = false;
        };

        const startIPFS = async (retry = false) => {
            // 1. Check valid global instance
            if ((window as any).divflowNode) {
                console.log("Reusing existing IPFS/OrbitDB node...");
                const { heliaNode, orbitNode } = (window as any).divflowNode;
                if (isMounted.current) {
                    setIpfs(heliaNode);
                    setOrbitdb(orbitNode);
                    setIsReady(true);
                }
                return;
            }

            // 2. Check pending promise
            if ((window as any).divflowInitPromise) {
                try {
                    const { heliaNode, orbitNode } = await (window as any).divflowInitPromise;
                    if (isMounted.current) {
                        setIpfs(heliaNode);
                        setOrbitdb(orbitNode);
                        setIsReady(true);
                    }
                } catch (e) {
                    console.error("Pending init failed", e);
                    // If pending failed, we might need to retry individually?
                    // For now, assume global promise handles its own cleanup.
                }
                return;
            }

            // 3. Init
            (window as any).divflowInitPromise = (async () => {
                try {
                    console.log('Initializing IPFS/OrbitDB (Global Singleton)...');

                    const { createHelia } = await import('helia');
                    const { createOrbitDB } = await import('@orbitdb/core');
                    // Use Memory stores - simplified imports
                    const { MemoryBlockstore } = await import('blockstore-core');
                    const { MemoryDatastore } = await import('datastore-core');
                    const { gossipsub } = await import('@chainsafe/libp2p-gossipsub');
                    const { noise } = await import('@chainsafe/libp2p-noise');
                    const { yamux } = await import('@libp2p/yamux');
                    const { bootstrap } = await import('@libp2p/bootstrap');
                    const { createLibp2p } = await import('libp2p');
                    const { webSockets } = await import('@libp2p/websockets');
                    const { webRTC } = await import('@libp2p/webrtc');
                    const { circuitRelayTransport } = await import('@libp2p/circuit-relay-v2');
                    const { identify } = await import('@libp2p/identify');

                    const { dcutr } = await import('@libp2p/dcutr');
                    const { autoNAT } = await import('@libp2p/autonat');

                    const libp2pOptions: any = {
                        addresses: {
                            listen: [
                                '/webrtc',
                                '/wss',
                                '/ws'
                            ]
                        },
                        transports: [
                            webSockets({ filter: () => true } as any),
                            webRTC(),
                            circuitRelayTransport({ discoverRelays: 1 } as any)
                        ],
                        connectionEncryption: [noise()],
                        streamMuxers: [yamux()],
                        peerDiscovery: [
                            bootstrap({
                                list: [
                                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
                                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                                    '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
                                ]
                            })
                        ],
                        services: {
                            dcutr: dcutr(),
                            autoNAT: autoNAT(),
                            identify: identify(),
                            pubsub: gossipsub({
                                allowPublishToZeroPeers: true,
                                canRelayMessage: true
                            } as any)
                        }
                    };

                    // Use Memory Stores to prevent CBOR corruption in browser
                    // Persistence is handled by the Chat Component via localStorage/OrbitDB sync
                    const blockstore = new MemoryBlockstore();
                    const datastore = new MemoryDatastore();

                    const libp2pNode = await createLibp2p(libp2pOptions);
                    const heliaNode = await createHelia({
                        libp2p: libp2pNode,
                        blockstore,
                        datastore
                    });

                    // Create OrbitDB with Memory Store
                    const orbitNode = await createOrbitDB({
                        ipfs: heliaNode,
                        directory: 'divflow-memory-orbitdb'
                    });

                    console.log('IPFS/OrbitDB Ready (Memory Mode)!', orbitNode?.identity?.id);

                    const nodeData = { heliaNode, orbitNode };
                    (window as any).divflowNode = nodeData;
                    return nodeData;

                } catch (err: any) {
                    console.error('IPFS Initialization Failed:', err);
                    (window as any).divflowInitPromise = null;
                    throw err;
                }
            })();

            // Await the promise
            try {
                const data = await (window as any).divflowInitPromise;
                if (data && isMounted.current) {
                    setIpfs(data.heliaNode);
                    setOrbitdb(data.orbitNode);
                    setIsReady(true);
                }
            } catch (e: any) {
                if (isMounted.current) setError(e.message || 'Failed to initialize P2P node');
            }
        };

        startIPFS();

        return cleanup;
    }, []);

    const connectToChat = async (propertyId: string) => {
        if (!orbitdb) throw new Error('OrbitDB not ready');
        const dbName = `divflow-chat-${propertyId}`;
        return await orbitdb.open(dbName, { type: 'events', accessController: { write: ['*'] } });
    };

    const broadcastAnnouncement = async (message: any) => {
        if (!ipfs || !ipfs.libp2p) return;
        try {
            const topic = 'divflow-global-discovery-v1';
            const msgStr = JSON.stringify(message);
            const msgParams = new TextEncoder().encode(msgStr);
            await ipfs.libp2p.services.pubsub.publish(topic, msgParams);
        } catch (e) {
            console.error("PubSub Broadcast Error:", e);
        }
    };

    // We expose the PubSub Accessor instead of a subscription helper to allow full control in components
    const pubsub = ipfs?.libp2p?.services?.pubsub;

    const reconnect = async () => {
        if (!ipfs || !ipfs.libp2p) return;
        console.log("Attempting Manual Reconnect...");
        setError(null);
        try {
            // Force dial bootstrap nodes
            const bootstraps = [
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
            ];

            // Import multiaddr dynamically
            const { multiaddr } = await import('@multiformats/multiaddr');

            for (const addr of bootstraps) {
                try {
                    await ipfs.libp2p.dial(multiaddr(addr));
                    console.log("Dialed:", addr);
                } catch (e) {
                    // Ignore individual dial failures
                }
            }
        } catch (e: any) {
            console.error("Reconnect Failed:", e);
        }
    };

    return (
        <IPFSContext.Provider value={{ ipfs, orbitdb, isReady, error, connectToChat, broadcastAnnouncement, reconnect }}>
            {children}
        </IPFSContext.Provider>
    );
};
