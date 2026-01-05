# 🏠 LandChain - Decentralized Land Registry

A blockchain-based land registry system built for transparency, security, and efficiency. This project enables secure property registration, verification, and marketplace transactions using smart contracts on Ethereum.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)
![Foundry](https://img.shields.io/badge/Foundry-latest-orange)

---

## ✨ Features

### 🔐 Secure Property Registration
- **Hashed Identity Storage**: User identity stored as cryptographic hashes for privacy
- **Duplicate Prevention**: Built-in checks for duplicate properties and documents
- **IPFS Document Storage**: Property documents stored on decentralized IPFS

### 🏛️ Multi-Role Verification System
- **Land Inspectors**: Physical verification of property claims
- **Revenue Department**: Approval required before marketplace listing
- **Role-Based Access**: Automatic UI adaptation based on user role

### 🛒 Decentralized Marketplace
- **Revenue Approval Gate**: Properties only visible after government approval
- **Multi-Bid System**: Buyers can make multiple offers on properties
- **Transparent Pricing**: Clear display of listed, offered, and accepted prices

### 📊 Tracking & Transparency
- **Property Timeline**: Track registration through all approval stages
- **Staff Contacts**: Both Land Inspector and Revenue Employee visible to owners
- **On-Chain History**: All transactions permanently recorded on blockchain

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, TailwindCSS, wagmi, viem |
| **Smart Contracts** | Solidity 0.8.20, Foundry |
| **Local Blockchain** | Anvil (Chain ID: 31337) |
| **Styling** | Tailwind CSS + Custom Design System |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [Foundry](https://getfoundry.sh/) (for smart contracts)
- [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/Yug-Baid/DivFlow-Web3-Upgrade.git
cd DivFlow-Web3-Upgrade
```

### 2. Start Local Blockchain
```bash
cd contracts
anvil
```
Keep this terminal running.

### 3. Deploy Smart Contracts
In a new terminal:
```bash
cd contracts
bash setup_and_deploy.sh
```
This compiles, deploys, and updates frontend config automatically.

### 4. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Open Application
Visit [http://localhost:3000](http://localhost:3000) and connect your wallet (MetaMask).

---

## 👥 Test Accounts (Anvil)

| Role | Account | Address |
|------|---------|---------|
| **Admin/Deployer** | Account 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| **Land Inspector** | Account 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| **Revenue Employee** | Account 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| **Citizens** | Account 3-9 | Use for testing registration & marketplace |

Import any account using private key from Anvil terminal output.

---

## 📂 Project Structure

```
DivFlow-Web3-Upgrade/
├── contracts/                  # Solidity smart contracts
│   ├── src/
│   │   ├── Users.sol          # User registration (hashed identity)
│   │   ├── LandRegistry.sol   # Property registration + duplicate prevention
│   │   ├── Properties.sol     # Property state management
│   │   └── TransferOfOwnership.sol  # Marketplace logic
│   ├── test/                  # Foundry tests
│   └── script/                # Deployment scripts
├── frontend/                  # Next.js 14 frontend
│   └── src/
│       ├── app/               # App router pages
│       ├── components/        # Reusable UI components
│       └── lib/               # Utilities & contract config
└── .agent/workflows/          # Development documentation
    ├── divflow-development.md # Development roadmap
    └── divflow-bugs.md        # Bug tracking
```

---

## 🔄 Property Lifecycle

```
1. Register Property    → Property created (Pending Review)
                             ↓
2. Inspector Verifies   → Property verified ✓
                             ↓
3. Owner Lists for Sale → Sale Pending (awaiting Revenue approval)
                             ↓
4. Revenue Approves     → Property visible on Marketplace
                             ↓
5. Buyer Makes Offer    → Seller sees all bids
                             ↓
6. Seller Accepts       → Buyer can pay within 1 hour
                             ↓
7. Payment Complete     → Ownership transferred on-chain
```

---

## 👨‍💻 Development

### Run Tests
```bash
cd contracts
forge test -vvv
```

### Deploy to New Network
Update `contracts/script/Deploy.s.sol` and run:
```bash
forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

Built with ❤️ for DivFlow Hackathon 2026
