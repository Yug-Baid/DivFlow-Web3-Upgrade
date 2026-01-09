// API Route: Fetch Real-time ETH to INR Price
// Uses CoinGecko API (free tier, no API key needed)

import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge Runtime for better performance
export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    // Fetch ETH price from CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr&include_24hr_change=true&include_last_updated_at=true',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract the data
    const ethData = data.ethereum;

    if (!ethData || !ethData.inr) {
      throw new Error('Invalid response from CoinGecko');
    }

    return NextResponse.json({
      success: true,
      price: ethData.inr,
      change24h: ethData.inr_24h_change || 0,
      lastUpdated: ethData.last_updated_at ? ethData.last_updated_at * 1000 : Date.now(),
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('ETH Price API Error:', error);
    
    // Return a fallback price if API fails
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch ETH price',
        fallbackPrice: 350000, // Approximate fallback
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}
