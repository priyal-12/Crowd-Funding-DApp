# Decentralized Crowd-Funding DApp

A complete decentralized crowd-funding application built on Ethereum Sepolia testnet with transparent escrow, dual voting system, and majority-based fund release.

## Features

✅ **Public Contributions** - Any MetaMask wallet can contribute ETH  
✅ **Escrow Locking** - Funds remain locked in the smart contract  
✅ **Spending Requests** - Manager can create spending proposals  
✅ **Dual Voting System** - Contributors can approve or reject requests  
✅ **Majority Rule** - Funds released only when >50% approve  
✅ **Security** - Re-entrancy protection and access control  

## Technology Stack

- **Smart Contract**: Solidity ^0.8.0
- **Blockchain**: Ethereum Sepolia Testnet
- **Wallet**: MetaMask
- **Frontend**: HTML + JavaScript
- **Blockchain Library**: web3.js

## Prerequisites

1. **MetaMask Extension** - Install from [metamask.io](https://metamask.io)
2. **Sepolia ETH** - Get free testnet ETH from:
   - [Sepolia Faucet](https://sepoliafaucet.com/)
   - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
   - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

## Project Structure

```
CrowdFund/
├── contracts/
│   └── CrowdFunding.sol    # Smart contract
├── index.html              # Main HTML file
├── style.css               # Styling
├── app.js                  # Web3.js integration
├── config.js               # Contract configuration
└── README.md               # This file
```

## Deployment Instructions

### Step 1: Deploy Smart Contract

1. Open [Remix IDE](https://remix.ethereum.org)
2. Create a new file `CrowdFunding.sol`
3. Copy the contract code from `contracts/CrowdFunding.sol`
4. Compile the contract (Solidity ^0.8.0)
5. Switch MetaMask to Sepolia Testnet
6. Deploy using "Injected Provider - MetaMask"
7. Copy the deployed contract address

### Step 2: Configure Frontend

1. Open `config.js`
2. Replace `YOUR_CONTRACT_ADDRESS_HERE` with your deployed contract address
3. The ABI is already included in the config file

### Step 3: Run the DApp

1. Open `index.html` in a web browser
2. Click "Connect MetaMask"
3. Approve the connection in MetaMask
4. Ensure you're on Sepolia Testnet

## How to Use

### For Contributors

1. **Connect Wallet** - Click "Connect MetaMask" button
2. **Contribute ETH** - Enter amount and click "Contribute"
3. **View Requests** - See all spending requests below
4. **Vote** - Click "Approve" or "Reject" on any request (one vote per request)

### For Manager (Contract Deployer)

1. **Create Request** - Fill in description, amount, and recipient address
2. **Monitor Votes** - See approval and rejection counts
3. **Finalize Request** - Click "Finalize" when >50% approve
4. **Funds Released** - ETH automatically sent to recipient

## Smart Contract Functions

### Public Functions

- `contribute()` - Contribute ETH to the campaign
- `approveRequest(uint requestId)` - Vote to approve a request
- `rejectRequest(uint requestId)` - Vote to reject a request

### Manager-Only Functions

- `createRequest(string description, uint amount, address recipient)` - Create spending request
- `finalizeRequest(uint requestId)` - Finalize approved request

### View Functions

- `getRequest(uint requestId)` - Get request details
- `hasVoted(uint requestId, address voter)` - Check if address voted
- `getBalance()` - Get contract balance
- `totalFunds` - Total ETH contributed
- `totalContributors` - Number of contributors
- `requestCount` - Number of requests

## Security Features

- **onlyManager** modifier - Restricts functions to manager
- **onlyContributor** modifier - Only contributors can vote
- **Re-entrancy Protection** - Checks-effects-interactions pattern
- **Double Voting Prevention** - Cannot vote twice on same request
- **Completion Check** - Prevents re-execution of finalized requests

## Testing Scenarios

### Test 1: Contribution
1. Connect multiple MetaMask wallets
2. Contribute different amounts
3. Verify total funds and contributor count update

### Test 2: Create Request
1. As manager, create a spending request
2. Verify request appears in the list
3. Try creating request from non-manager wallet (should fail)

### Test 3: Voting
1. As contributor, approve a request
2. Try voting again (should fail - double voting prevention)
3. From another wallet, reject the request
4. Verify vote counts update

### Test 4: Finalization
1. Get >50% approvals on a request
2. As manager, click "Finalize"
3. Verify funds transferred to recipient
4. Verify request marked as completed
5. Try finalizing again (should fail)

## Troubleshooting

**"Please install MetaMask"**
- Install MetaMask browser extension

**"Please switch to Sepolia Testnet"**
- Open MetaMask → Networks → Select Sepolia

**"Insufficient funds"**
- Get Sepolia ETH from faucets listed above

**"Only manager can call this"**
- Only the contract deployer can create/finalize requests

**"Only contributors can vote"**
- You must contribute ETH before voting

**"Majority approval required"**
- Need >50% of contributors to approve before finalizing

## Important Notes

⚠️ This is a testnet application - use only Sepolia ETH (no real value)  
⚠️ The contract deployer becomes the manager  
⚠️ Contributors can vote only once per request (approve OR reject)  
⚠️ Funds are released only when approval votes > 50% of total contributors  
⚠️ Manager cannot withdraw funds directly - only through approved requests  

## License

MIT License - Free to use and modify
