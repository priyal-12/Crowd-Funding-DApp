# VaultMind — System Specifications

---

## 🖥️ Software Specifications

### Blockchain & Frontend

| Component | Specification |
|-----------|--------------|
| Smart Contract | **Solidity ^0.8.0**, deployed on **Sepolia Testnet** |
| Deployment Tool | **Remix IDE** |
| Wallet | **MetaMask** via `eth_requestAccounts` |
| Web3 Library | **Web3.js v4.x** |
| Frontend | **HTML5, Vanilla CSS3, JavaScript ES6+** |
| XSS Protection | **DOMPurify / `.textContent` rendering** |

### AI & Backend

| Component | Specification |
|-----------|--------------|
| Serverless Runtime | **Vercel Functions (Node.js 18+)** |
| AI Model | **Google Gemini API (`gemini-2.0-flash`)** |
| API Security | **Server-side `.env` variable** |
| Dev & Deployment | **Git, GitHub, Vercel CLI** |

---

## 🔧 Hardware Specifications

> Entirely browser and cloud-based — no dedicated hardware required.

| Requirement | Minimum |
|------------|---------|
| Processor | Dual-core, 1.6 GHz |
| RAM | 4 GB |
| Browser | Chrome / Firefox / Brave (MetaMask-compatible) |
| Internet | Stable broadband |
| OS | Windows 10 / macOS 11 / Ubuntu 20.04+ |

---

## ⚙️ Methods & Algorithms

| Feature | Method |
|---------|--------|
| **Escrow & Fund Release** | Majority-vote smart contract; re-entrancy guard via `completed = true` before `transfer()` |
| **Sybil Prevention** | Minimum contribution threshold restricts voting rights to meaningful contributors |
| **Legitimacy Scoring** | Zero-shot LLM classification — scores request description + amount against plausibility criteria |
| **Anomaly Detection** | **Isolation Forest** on contribution amount, timing, and wallet age |
| **Vote Prediction** | **Logistic Regression** on approval ratio, elapsed time, and amount as % of balance |
| **Conversational AI** | Live contract state injected as system prompt into Gemini API (RAG-lite); conversation history maintained client-side |
| **Wallet Authentication** | **Sign-In with Ethereum (SIWE)** — `personal_sign` + `ecrecover` server-side verification |
