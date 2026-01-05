# DivFlow-Web3 Deployment Guide

> **Purpose**: Guide for deploying the Web3 land registry to production
> **Status**: Research documented - NOT YET IMPLEMENTED
> **Last Updated**: 2026-01-05

---

## 📋 Current Issues to Fix Before Deployment

### Bug Reports (from user):
- [ ] **Transfer not working** - Land transfer functionality is broken
- [ ] **Transfer request workflow** - Should go through Land Registry Officer approval
- [ ] **Get Started button for staff** - Should show "Launch App" instead of "Get Started" for connected staff wallets

---

## 🚀 Recommended Deployment Architecture

### Option 1: Vercel (RECOMMENDED for Hackathon)
- **Best for**: Next.js projects (zero-config deployment)
- **Free tier**: Yes, generous limits
- **HTTPS**: Automatic
- **CI/CD**: Built-in from GitHub

### Option 2: Netlify
- **Best for**: JAMstack, static sites
- **OpenNext adapter**: Supports full Next.js features
- **Free tier**: Yes

### Smart Contract Networks:
| Network | Type | Use Case |
|---------|------|----------|
| **Sepolia** | Testnet | Development & testing |
| **Polygon** | Mainnet/L2 | Production (low gas fees) |
| **Ethereum Mainnet** | Mainnet | High-value, long-term |

---

## 📝 Deployment Steps

### Step 1: Smart Contract Deployment

#### 1.1 Get API Keys
- [ ] Sign up for [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/)
- [ ] Get API key for Sepolia testnet
- [ ] Get API key for Polygon mainnet (if needed)

#### 1.2 Get Test ETH
- Sepolia faucets: [Google Cloud Web3 Faucet](https://cloud.google.com/web3/faucet), [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- For Polygon: Get MATIC from exchanges

#### 1.3 Configure Foundry for Remote Deployment
```bash
# In foundry.toml, add:
[rpc_endpoints]
sepolia = "https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
polygon = "https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
```

#### 1.4 Deploy to Sepolia
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
```

#### 1.5 Update Frontend with Contract Addresses
Update `frontend/src/lib/contracts.ts` with deployed addresses

---

### Step 2: Frontend Deployment (Vercel)

#### 2.1 Push to GitHub
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

#### 2.2 Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel auto-detects Next.js

#### 2.3 Configure Environment Variables
In Vercel dashboard, add:
```
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<API_KEY>
NEXT_PUBLIC_CHAIN_ID=11155111
PINATA_API_KEY=<your_key>
PINATA_SECRET=<your_secret>
```

#### 2.4 Deploy
Click "Deploy" - Vercel handles build and hosting

---

## 🔄 CI/CD Pipeline (GitHub Actions)

### Recommended Workflow:
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
      - name: Run Forge tests
        run: cd contracts && forge test -vvv
      
  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          
  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Note on Kubernetes:
For a hackathon demo, **Kubernetes is overkill**. Use Vercel's serverless platform instead. Kubernetes is better for:
- Multi-service architectures
- High-scale production systems
- Custom infrastructure requirements

---

## 🔒 Security Measures for Production

### 1. Rate Limiting
- **Where**: Next.js API routes or Vercel Edge Config
- **Implementation**:
```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  if (!success) return new Response("Too Many Requests", { status: 429 });
}
```

### 2. DDoS Protection
- **Vercel**: Built-in basic protection
- **Cloudflare**: Add as CDN for enhanced protection (free tier available)
  - Enable "Under Attack" mode if needed
  - Set up WAF rules

### 3. Web Application Firewall (WAF)
- **Cloudflare WAF**: Free tier with managed rules
- **Vercel Firewall**: Available in Pro plan

### 4. Environment Variable Security
- ❌ Never commit secrets to Git
- ✅ Use Vercel environment variables
- ✅ Use `.env.local` for local development only
- ✅ Use server-side API routes for sensitive operations

### 5. Smart Contract Security
- [ ] Run Slither static analysis: `slither contracts/src/`
- [ ] Consider professional audit before mainnet
- [ ] Test extensively on Sepolia before Polygon/mainnet

---

## ✅ Pre-Deployment Checklist

### Code Quality:
- [ ] All tests passing (`forge test`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)

### Security:
- [ ] No secrets in codebase
- [ ] Rate limiting configured
- [ ] Contract audited/tested

### Environment:
- [ ] RPC URLs configured for target network
- [ ] Contract addresses updated
- [ ] IPFS/Pinata configured

### Monitoring (Optional):
- [ ] Error tracking (Sentry)
- [ ] Analytics (Vercel Analytics)
- [ ] Uptime monitoring (UptimeRobot)

---

## 🎯 Hackathon Demo Recommendation

For the hackathon, use this simplified approach:

1. **Deploy contracts to Sepolia** (free test ETH)
2. **Deploy frontend to Vercel** (free, fast, auto-HTTPS)
3. **Skip Kubernetes** (not needed for demo)
4. **Use Cloudflare** for CDN/DDoS protection (free tier)

This gives you a production-quality demo without complex infrastructure.
