/**
 * Aadhaar Validation Utilities
 * 
 * Implements the Verhoeff algorithm used by UIDAI for Aadhaar number validation.
 * This is the actual mathematical algorithm used to validate Aadhaar numbers.
 */

// Verhoeff multiplication table
const verhoeffD: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// Verhoeff permutation table
const verhoeffP: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/**
 * Validates an Aadhaar number using the Verhoeff checksum algorithm.
 * This is the same algorithm used by UIDAI.
 * 
 * @param aadhaar - 12-digit Aadhaar number as string
 * @returns true if the Aadhaar number has a valid checksum
 */
export function verhoeffCheck(aadhaar: string): boolean {
  let c = 0;
  const reversedDigits = aadhaar.split('').reverse().map(Number);
  
  for (let i = 0; i < reversedDigits.length; i++) {
    c = verhoeffD[c][verhoeffP[i % 8][reversedDigits[i]]];
  }
  
  return c === 0;
}

/**
 * Validates Aadhaar number format and checksum.
 * 
 * @param aadhaar - Aadhaar number to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateAadhaar(aadhaar: string): { 
  isValid: boolean; 
  error?: string;
  formatted?: string;
} {
  // Remove any spaces or hyphens
  const cleaned = aadhaar.replace(/[\s-]/g, '');
  
  // Check if it's exactly 12 digits
  if (!/^\d{12}$/.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'Aadhaar must be exactly 12 digits' 
    };
  }
  
  // Aadhaar cannot start with 0 or 1
  if (cleaned.startsWith('0') || cleaned.startsWith('1')) {
    return { 
      isValid: false, 
      error: 'Aadhaar cannot start with 0 or 1' 
    };
  }
  
  // Validate using Verhoeff algorithm
  if (!verhoeffCheck(cleaned)) {
    return { 
      isValid: false, 
      error: 'Invalid Aadhaar number (checksum failed)' 
    };
  }
  
  // Format as XXXX-XXXX-XXXX for display
  const formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`;
  
  return { 
    isValid: true, 
    formatted 
  };
}

/**
 * Validates Indian mobile number format.
 * 
 * @param mobile - Mobile number to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateMobile(mobile: string): {
  isValid: boolean;
  error?: string;
  formatted?: string;
} {
  // Remove any spaces, hyphens, or +91 prefix
  let cleaned = mobile.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  
  // Check if it's exactly 10 digits
  if (!/^\d{10}$/.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'Mobile number must be exactly 10 digits' 
    };
  }
  
  // Indian mobile numbers start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'Invalid Indian mobile number' 
    };
  }
  
  return { 
    isValid: true, 
    formatted: `+91 ${cleaned.slice(0, 5)}-${cleaned.slice(5)}` 
  };
}

/**
 * Simulates Aadhaar-Mobile link verification.
 * 
 * NOTE: This is always simulated because real Aadhaar-Mobile link verification
 * requires Surepass/Setu API access which needs enterprise signup.
 * 
 * The demoMode flag only affects OTP delivery:
 * - Demo Mode ON: OTP shown on screen
 * - Demo Mode OFF: Real SMS sent via Fast2SMS
 * 
 * @param aadhaar - Aadhaar number
 * @param mobile - Mobile number
 * @param demoMode - Whether to run in demo mode (affects OTP delivery, not link check)
 * @returns Promise with verification result
 */
export async function verifyAadhaarMobileLink(
  aadhaar: string,
  mobile: string,
  demoMode: boolean = true
): Promise<{
  linked: boolean;
  message: string;
  verificationId?: string;
}> {
  // Simulate API delay (makes it look realistic)
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Always return linked (simulated verification)
  // In a real production app with Surepass/Setu, this would call their API
  return {
    linked: true,
    message: demoMode 
      ? 'Mobile number is linked to Aadhaar (Demo Mode)' 
      : 'Mobile number verified with Aadhaar (Simulated - Real SMS will be sent)',
    verificationId: `VER-${Date.now()}`
  };
}

/**
 * Masks Aadhaar number for display (shows only last 4 digits).
 * 
 * @param aadhaar - Full Aadhaar number
 * @returns Masked Aadhaar string
 */
export function maskAadhaar(aadhaar: string): string {
  const cleaned = aadhaar.replace(/[\s-]/g, '');
  if (cleaned.length !== 12) return 'XXXX-XXXX-XXXX';
  return `XXXX-XXXX-${cleaned.slice(8)}`;
}

/**
 * PAN Card Validation
 * 
 * PAN (Permanent Account Number) format: AAAAA0000A
 * - First 3 characters: Alphabetic series (AAA-ZZZ)
 * - 4th character: Entity type
 *   - C = Company
 *   - P = Person
 *   - H = Hindu Undivided Family
 *   - F = Firm
 *   - A = Association of Persons
 *   - T = Trust
 *   - B = Body of Individuals
 *   - L = Local Authority
 *   - J = Artificial Juridical Person
 *   - G = Government
 * - 5th character: First letter of surname/name
 * - Next 4 characters: Sequential digits (0001-9999)
 * - Last character: Alphabetic check digit
 */

// Valid entity type codes for the 4th character
const PAN_ENTITY_TYPES: { [key: string]: string } = {
  'C': 'Company',
  'P': 'Person',
  'H': 'Hindu Undivided Family',
  'F': 'Firm',
  'A': 'Association of Persons',
  'T': 'Trust',
  'B': 'Body of Individuals',
  'L': 'Local Authority',
  'J': 'Artificial Juridical Person',
  'G': 'Government'
};

/**
 * Validates PAN card number format and structure.
 * 
 * @param pan - PAN card number to validate
 * @returns Object with isValid boolean, error message if invalid, and entity type
 */
export function validatePAN(pan: string): {
  isValid: boolean;
  error?: string;
  formatted?: string;
  entityType?: string;
} {
  // Remove any spaces or hyphens and convert to uppercase
  const cleaned = pan.replace(/[\s-]/g, '').toUpperCase();
  
  // Check if it's exactly 10 characters
  if (cleaned.length !== 10) {
    return {
      isValid: false,
      error: 'PAN must be exactly 10 characters'
    };
  }
  
  // Validate overall format: AAAAA0000A
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!panRegex.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid PAN format (should be AAAAA0000A)'
    };
  }
  
  // Validate 4th character (entity type)
  const entityCode = cleaned.charAt(3);
  if (!PAN_ENTITY_TYPES[entityCode]) {
    return {
      isValid: false,
      error: `Invalid entity type code '${entityCode}' in PAN`
    };
  }
  
  // Validate sequential number is not 0000
  const sequentialNum = cleaned.substring(5, 9);
  if (sequentialNum === '0000') {
    return {
      isValid: false,
      error: 'Invalid sequential number in PAN'
    };
  }
  
  return {
    isValid: true,
    formatted: cleaned,
    entityType: PAN_ENTITY_TYPES[entityCode]
  };
}

/**
 * Masks PAN for display (shows only last 4 characters).
 * 
 * @param pan - Full PAN number
 * @returns Masked PAN string
 */
export function maskPAN(pan: string): string {
  const cleaned = pan.replace(/[\s-]/g, '').toUpperCase();
  if (cleaned.length !== 10) return 'XXXXXX0000';
  return `XXXXXX${cleaned.slice(6)}`;
}

/**
 * Generates a list of valid test Aadhaar numbers for demo purposes.
 * These pass the Verhoeff checksum but are not real Aadhaar numbers.
 */
export const DEMO_AADHAAR_NUMBERS = [
  '234567890123', // Valid checksum
  '499118665246', // Valid checksum  
  '234123412346', // Valid checksum
];

/**
 * Valid demo PAN numbers for testing.
 * These follow the correct format but are not real PANs.
 */
export const DEMO_PAN_NUMBERS = [
  'ABCDE1234F', // Valid format - Person
  'ABCPK1234G', // Valid format - Person with K surname
  'AAACB1234H', // Valid format - Company
];
