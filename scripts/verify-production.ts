/**
 * Production Verification Test Script
 * 
 * Run with: npx ts-node scripts/verify-production.ts
 * Or manually test each endpoint
 */

const ENDPOINTS = {
  // World ID Verification
  verify: {
    method: 'POST',
    url: '/api/verify',
    description: 'World ID proof verification via World ID Developer API',
    requiredEnv: ['WORLDCOIN_APP_ID'],
    body: {
      proof: 'test-proof',
      nullifier_hash: '0x1234...',
      merkle_root: '0x5678...',
      verification_level: 'device',
      action: 'cerberus-verify',
    },
  },

  // x402 Payment
  x402Create: {
    method: 'POST',
    url: '/api/x402/pay',
    description: 'Create x402 payment requirements',
    requiredEnv: [],
    body: {
      amount: '0.045',
      token: 'ETH',
      recipient: '0x1234...',
      world_id_nullifier: '0xabcd...',
      proposal_id: 1,
      user_address: '0x5678...',
    },
  },

  x402Verify: {
    method: 'PUT',
    url: '/api/x402/pay',
    description: 'Verify and settle x402 payment',
    requiredEnv: ['CDP_API_KEY_ID', 'CDP_API_KEY_SECRET'], // Optional but recommended
    body: {
      paymentId: 'pay-1234...',
      paymentPayload: { /* signed payment */ },
      world_id_nullifier: '0xabcd...',
    },
  },

  x402Status: {
    method: 'GET',
    url: '/api/x402/pay?paymentId=pay-1234',
    description: 'Check x402 payment status',
    requiredEnv: [],
  },
};

const REQUIRED_ENV = {
  // Public (available in browser)
  public: [
    'NEXT_PUBLIC_WORLDCOIN_APP_ID',
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
    'NEXT_PUBLIC_XMTP_ENV',
  ],
  
  // Server-only
  server: [
    'WORLDCOIN_APP_ID',
  ],
  
  // Optional (for enhanced functionality)
  optional: [
    'CDP_API_KEY_ID',
    'CDP_API_KEY_SECRET',
  ],
};

console.log('=== Cerberus Production Verification ===\n');

// Check environment variables
console.log('Environment Variables:');
for (const [category, vars] of Object.entries(REQUIRED_ENV)) {
  console.log(`\n${category.toUpperCase()}:`);
  for (const v of vars) {
    const value = process.env[v];
    const status = value ? '✅' : (category === 'optional' ? '⚪' : '❌');
    const display = value ? `${value.slice(0, 20)}...` : 'not set';
    console.log(`  ${status} ${v}: ${display}`);
  }
}

console.log('\n\nAPI Endpoints:');
for (const [name, config] of Object.entries(ENDPOINTS)) {
  console.log(`\n${name}:`);
  console.log(`  Method: ${config.method}`);
  console.log(`  URL: ${config.url}`);
  console.log(`  Description: ${config.description}`);
  console.log(`  Required Env: ${config.requiredEnv.join(', ') || 'none'}`);
}

console.log('\n\nVerification Complete!');
console.log('To test manually, start the dev server with: npm run dev');
console.log('Then visit http://localhost:3000');
