// Polyfills for OrbitDB and IPFS in browser
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  if (!window.Buffer) {
    window.Buffer = Buffer;
  }
  if (!window.process) {
    window.process = require('process');
  }
}
