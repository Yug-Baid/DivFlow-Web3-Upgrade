"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
    ssr: false,
    loading: () => (
        <div className="h-[400px] w-full rounded-lg bg-secondary/30 flex items-center justify-center border border-border">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p>Loading Map...</p>
            </div>
        </div>
    ),
});

export default LeafletMap;
