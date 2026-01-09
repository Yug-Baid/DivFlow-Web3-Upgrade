// Reverse Geocoding API Route
// Converts latitude/longitude to human-readable address using OpenStreetMap Nominatim

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { success: false, error: 'Missing latitude or longitude' },
      { status: 400 }
    );
  }

  // Validate coordinates
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { success: false, error: 'Invalid coordinates' },
      { status: 400 }
    );
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { success: false, error: 'Coordinates out of range' },
      { status: 400 }
    );
  }

  try {
    // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`,
      {
        headers: {
          'User-Agent': 'DivFlow-Web3-LandRegistry/1.0', // Required by Nominatim
          'Accept': 'application/json',
        },
        // Respect rate limit: 1 request per second
        next: { revalidate: 0 }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    // Extract address components
    const address = data.address || {};
    
    // Build a comprehensive address string for India
    const addressParts = [
      address.house_number || '',
      address.road || address.street || '',
      address.suburb || address.neighbourhood || address.hamlet || '',
      address.village || address.town || address.city || '',
      address.county || address.state_district || '',
      address.state || '',
      address.postcode || '',
    ].filter(Boolean);

    const addressLine = addressParts.join(', ');

    // Create a detailed formatted address
    const formattedAddress = data.display_name || addressLine;

    return NextResponse.json({
      success: true,
      address: addressLine,
      formatted: formattedAddress,
      components: {
        houseNumber: address.house_number || '',
        street: address.road || address.street || '',
        area: address.suburb || address.neighbourhood || '',
        city: address.city || address.town || address.village || '',
        district: address.county || address.state_district || '',
        state: address.state || '',
        postcode: address.postcode || '',
        country: address.country || 'India'
      },
      coordinates: {
        lat: latitude,
        lng: longitude
      }
    });

  } catch (error: any) {
    console.error('Geocoding error:', error);
    
    // Return a basic fallback with coordinates
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch address',
        fallback: {
          address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          coordinates: { lat: latitude, lng: longitude }
        }
      },
      { status: 500 }
    );
  }
}
