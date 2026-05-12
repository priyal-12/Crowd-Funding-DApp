# Decentralized Phase-Based Crowdfunding Platform

## 1. Project Overview
**What it is:** A decentralized application (DApp) that redefines traditional crowdfunding by introducing milestone-driven, phase-based funding powered by Ethereum smart contracts.
**Purpose:** To build a trustless, transparent, and secure environment where contributors retain control over their funds. Instead of releasing the entire funding goal at once, funds are unlocked sequentially upon successful completion and community approval of specific project phases.
**How it works:** Project creators define campaigns with multiple financial targets (phases). Contributors fund the active phase. Once the target is met, the creator submits an execution plan. Contributors vote on this plan. If approved, funds are transferred directly to a designated beneficiary. The creator must then submit proof of completed work to unlock the next funding phase.
**Workflow:**
Funding -> Plan Pending -> Voting -> Approved -> Work In Progress -> Completed -> (Next Phase) Funding.

## 2. User Roles and Responsibilities

### Admin / Manager
* **Definition:** The deployer of the main `CrowdFundingPlatform` smart contract.
* **Responsibilities & Permissions:** Maintains overall platform security. Has the power to pause/unpause the platform in case of emergencies or critical vulnerabilities. Can assist in finalizing votes.
* **Limitations:** The Admin **cannot** access campaign funds, alter votes, create plans, or change campaign beneficiaries. The platform remains decentralized because the Admin acts only as an emergency safety valve, not a fund custodian.

### Creator / Coordinator
* **Definition:** The individual or entity launching a campaign to raise funds for a project.
* **Responsibilities & Permissions:** Creates the campaign by setting phase targets and a beneficiary address. Submits detailed plans (via IPFS) for each phase. Triggers the release of funds once the community approves the plan. Submits proof of work (via IPFS) once a phase is completed to unlock the next phase. Can reset a phase if a plan is rejected.
* **Limitations:** Cannot be the beneficiary of the funds themselves (preventing self-dealing and rug pulls). Cannot vote on their own plans. Cannot withdraw funds without community majority approval.

### Beneficiary
* **Definition:** The external address designated to receive the unlocked funds.
* **Responsibilities:** Executes the real-world or digital tasks associated with the project using the released funds.
* **Limitations:** Completely passive on-chain. Cannot manage the campaign, submit proofs, or vote. Separating the Creator and Beneficiary adds an extra layer of operational security.

### Contributor
* **Definition:** Users who supply the capital (ETH) for the campaigns.
* **Responsibilities & Permissions:** Contribute funds to active phases. Review submitted phase plans. Vote (Yes/No) on whether to approve a phase plan. Claim refunds if a plan is rejected. Provide reviews and ratings (1-5 stars) for creators after contributing.
* **Limitations:** Can only vote once per phase attempt. Voting weight is currently 1 contributor = 1 vote.

### Manager vs. Creator Differences
* **Scope:** The Manager oversees the *platform infrastructure* (pausing, unpausing). The Creator manages a *specific campaign*.
* **Funds:** Neither the Manager nor the Creator can directly withdraw funds to their own wallets arbitrarily. Funds strictly flow from Contributors to the Smart Contract, and then to the specific Campaign Beneficiary, governed purely by logic.

## 3. Core System Features

* **Phase-Based Funding System:** Campaigns are broken down into a maximum of 10 phases. Funds are raised and locked per phase, drastically reducing the risk of a creator abandoning a project after receiving all funds.
* **Voting Process:** A democratic consensus mechanism. Once a phase is funded, contributors vote on the creator's proposed plan. Majority rules (Yes votes > No votes). Only users who contributed to the current phase can vote.
* **Direct Beneficiary Payments:** When a plan is approved, the creator triggers the fund release. The smart contract automatically transfers the phase's target amount directly to the predetermined beneficiary address, bypassing the creator.
* **Proof Submission:** After the beneficiary receives funds and completes the work, the creator must submit a decentralized proof (IPFS CID) of the completed work. This transitions the current phase to "Completed" and automatically opens the next phase for funding.
* **Review/Rating System:** A reputation mechanism where contributors can rate creators (1-5 stars) and leave feedback (stored via IPFS). This builds a decentralized trust score for creators over time.
* **Dashboard Features:** A comprehensive user interface where users can track their contributions, monitor campaign statuses, review IPFS plans/proofs, and execute actions (vote, claim refunds, rate creators).
* **PIN Security System:** A localized frontend security feature that requires users to enter a customized Security PIN specifically when making monetary contributions, adding a layer of user-intent verification before MetaMask transaction signing.
* **Demo Crypto Purchase Feature:** An educational, child-friendly simulation on the homepage. It explains blockchain currency basics and allows users to "Buy Crypto" in a simulated, non-monetary environment to familiarize newcomers with Web3 interactions before dealing with real assets.

## 4. Complete Campaign Lifecycle Step-by-Step

1. **Campaign Creation:** A Creator initiates a campaign, specifying the Beneficiary address and an array of target amounts for each phase. The first phase enters the `Funding` status.
2. **Funding Phases:** Contributors send ETH to the campaign. The smart contract tracks the progress. Once the `totalRaised` equals the `targetAmount`, the phase automatically transitions to `PlanPending`.
3. **Plan Submission:** The Creator uploads a detailed execution plan to IPFS and submits the resulting IPFS CID to the smart contract. The phase status updates to `Voting`.
4. **Voting:** Contributors review the IPFS document and cast their votes (Support or Reject). 
5. **Fund Release / Finalization:** Once voting concludes, the result is finalized. If approved (`Approved` status), the Creator calls `releaseFunds()`, and the smart contract sends the ETH to the Beneficiary. The status becomes `WorkInProgress`.
6. **Proof Submission:** Once the phase work is done, the Creator uploads proof to IPFS and submits the CID. The phase is marked `Completed`.
7. **Next Phase Activation:** Submitting proof automatically advances the campaign to the next phase index, setting its status to `Funding`, and the cycle repeats.
8. **Refunds & Resets (Alternative Path):** If a plan is rejected during voting (`Rejected` status):
    * Contributors can call `claimRefund()` to retrieve their exact contribution for that phase.
    * The Creator can call `resetPhase()` to move the phase back to `Funding`. Previous votes are nullified, allowing the Creator to try again with a better plan, provided contributors re-fund or left their funds in the contract.

## 5. Technology Stack & Platform Architecture

* **Blockchain & Smart Contracts:** Built on Ethereum (specifically the Sepolia Testnet) using Solidity. Smart contracts provide an immutable, mathematically guaranteed execution of the crowdfunding rules, removing the need for a trusted third-party intermediary like Kickstarter or GoFundMe.
* **Decentralization & Transparency:** Every contribution, vote, and state change is recorded publicly on the blockchain. Anyone can verify the exact amount of funds held in the contract and track where every Wei is sent.
* **MetaMask/Web3:** The platform interfaces with the user's browser wallet (MetaMask) via Web3.js, enabling secure transaction signing and seamless interaction with the Ethereum network directly from the web browser.
* **IPFS (InterPlanetary File System):** To keep blockchain gas costs low, large data like campaign plans, work proofs, and user feedback are not stored on-chain. Instead, they are uploaded to IPFS. Only the resulting lightweight cryptographic hash (CID) is stored in the smart contract.
* **Gas Optimization:** The contract is engineered for efficiency. Data structures are packed, mappings are used for O(1) lookups (e.g., `hasContributed`), and intensive logic is kept to a minimum to ensure interacting with the platform is as cheap as possible for users.
* **User Interaction (Homepage & Dashboard):** The frontend consists of HTML/CSS/JS. The homepage serves to educate users, display the Demo Crypto feature, and list active campaigns. The Dashboard is dynamically rendered, pulling real-time blockchain data to allow users to manage their active investments, cast votes, and participate in the decentralized governance of the projects they support.
