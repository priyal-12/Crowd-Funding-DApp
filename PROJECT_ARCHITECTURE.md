# Project Architecture and Context: Decentralized Crowd-Funding DApp (VaultMind)

## 1. Project Context & Overview
**VaultMind** is a decentralized application (DApp) designed to redefine traditional crowdfunding by introducing a **milestone-driven, phase-based funding model**. It operates on the Ethereum blockchain (Sepolia Testnet) utilizing smart contracts to ensure transparency, security, and trustless execution.

The core problem it solves is the risk of creators abandoning projects after receiving full funding. Instead of releasing the entire funding goal upfront, VaultMind locks funds in an escrow smart contract. Funds are released sequentially in phases, only after:
1. The funding target for a phase is met.
2. The creator submits a detailed execution plan (stored via IPFS).
3. The contributors (who funded the phase) vote and approve the plan via a majority consensus.
4. Proof of completed work is submitted to unlock the subsequent phase.

## 2. Core Architecture Components

The architecture follows a modern Web3 DApp structure, combining decentralized blockchain logic with an AI-enhanced frontend and serverless backend.

### 2.1 Smart Contract Layer (Blockchain)
*   **Technology:** Solidity ^0.8.0
*   **Network:** Ethereum Sepolia Testnet
*   **Key Contract:** `CrowdFundingPlatform.sol`
*   **Functionality:**
    *   **Escrow:** Holds contributed Sepolia ETH securely.
    *   **State Management:** Manages campaign phases, funding targets, and current status (Funding, PlanPending, Voting, WorkInProgress, Completed).
    *   **Voting Logic:** Enforces the democratic consensus mechanism (1 contributor = 1 vote). Calculates majority approvals to authorize fund releases.
    *   **Security:** Implements modifiers (`onlyManager`, `onlyContributor`), Re-entrancy guards (Checks-Effects-Interactions pattern), and prevents self-dealing (creator cannot be the beneficiary).
    *   **Data Storage:** Stores crucial lightweight data (addresses, balances, vote counts, IPFS CIDs for plans/proofs).

### 2.2 Frontend Layer (Client-Side)
*   **Technology:** HTML5, Vanilla CSS3, JavaScript (ES6+), Web3.js (v4.x)
*   **Wallet Integration:** MetaMask (via `eth_requestAccounts`)
*   **Files:** `index.html`, `style.css`, `app.js`, `config.js`
*   **Functionality:**
    *   **User Interface:** Displays active campaigns, funding progress, voting dashboards, and educational components (e.g., "Demo Crypto Purchase").
    *   **Blockchain Interaction:** `app.js` uses Web3.js and the contract ABI (from `config.js`) to read contract state and prompt MetaMask to sign transactions (contribute, vote, release funds).
    *   **Security:** Implements Selective PIN Security (SHA-256 hashed in local storage) required specifically for financial contributions, reducing friction for non-financial actions. DOMPurify is used for XSS protection when rendering text.

### 2.3 Off-Chain Storage (Decentralized File System)
*   **Technology:** IPFS (InterPlanetary File System)
*   **Functionality:** To keep blockchain gas costs low, large data payloads such as the creator's execution plans, proof of work documents, and user feedback/reviews are uploaded to IPFS. Only the resulting cryptographic hash (CID) is stored on-chain in the smart contract.

### 2.4 AI & Backend Layer (Serverless)
*   **Technology:** Vercel Serverless Functions (Node.js 18+), Google Gemini API (`gemini-2.0-flash`)
*   **Functionality:**
    *   **Legitimacy Scoring:** Zero-shot LLM classification scores spending request descriptions against the requested amount to flag suspicious plans.
    *   **Anomaly Detection:** Utilizes algorithms (like Isolation Forest) to detect unusual contribution patterns based on amount, timing, and wallet age.
    *   **Vote Prediction:** Logistic Regression models predict the likelihood of a plan's approval based on current approval ratios, time elapsed, and funding volume.
    *   **Conversational AI Assistant:** A RAG-lite implementation where live smart contract state is injected into the Gemini API system prompt, allowing users to ask natural language questions about the platform's current status.

## 3. User Roles & Workflow

1.  **Admin/Manager (Deployer):** Deploys the contract. Acts as an emergency safety valve (can pause/unpause) but cannot access funds or alter votes.
2.  **Creator (Campaign Coordinator):** Creates campaigns, sets target phases, submits IPFS plans/proofs, and triggers the release of funds upon community approval. Cannot be the beneficiary.
3.  **Beneficiary:** The external wallet address that passively receives the unlocked funds to execute the project tasks.
4.  **Contributor:** Supplies capital (ETH) to active phases. Reviews IPFS plans and casts Yes/No votes. Can claim refunds if a plan is rejected.

## 4. Key Workflows (Phase Lifecycle)
1.  **Funding:** Contributors send ETH. Once `totalRaised` >= `targetAmount`, phase moves to `PlanPending`.
2.  **Plan Submission:** Creator uploads plan to IPFS, submits CID to contract. Phase moves to `Voting`.
3.  **Voting:** Contributors vote (Yes/No).
4.  **Fund Release:** If approved, Creator triggers release. Funds go to Beneficiary. Phase becomes `WorkInProgress`. (If rejected, contributors can claim refunds or creator can reset the phase).
5.  **Proof Submission:** Creator uploads proof of completed work to IPFS and submits CID. Phase becomes `Completed`, unlocking the next phase.
