# Deployment Guide - CrowdFunding DApp

This guide will walk you through deploying the smart contract to Sepolia testnet and configuring the frontend.

## Prerequisites Checklist

- [ ] MetaMask installed and set up
- [ ] MetaMask switched to Sepolia Testnet
- [ ] Sepolia ETH in your wallet (at least 0.1 ETH for deployment and testing)

## Step 1: Get Sepolia ETH

You need Sepolia ETH to deploy the contract and test the dApp.

### Faucet Options:

1. **Alchemy Sepolia Faucet**
   - Visit: https://sepoliafaucet.com/
   - Sign in with Alchemy account
   - Enter your wallet address
   - Receive 0.5 Sepolia ETH per day

2. **Infura Sepolia Faucet**
   - Visit: https://www.infura.io/faucet/sepolia
   - Sign in with Infura account
   - Enter your wallet address

3. **QuickNode Faucet**
   - Visit: https://faucet.quicknode.com/ethereum/sepolia
   - Enter your wallet address

## Step 2: Deploy Smart Contract Using Remix

### 2.1 Open Remix IDE

1. Go to https://remix.ethereum.org
2. You'll see the default workspace

### 2.2 Create Contract File

1. In the File Explorer (left sidebar), click the "+" icon to create a new file
2. Name it `CrowdFunding.sol`
3. Copy the entire content from `contracts/CrowdFunding.sol` in your project
4. Paste it into the Remix editor

### 2.3 Compile the Contract

1. Click on the "Solidity Compiler" icon (left sidebar, 3rd icon)
2. Select compiler version `0.8.0` or higher
3. Click "Compile CrowdFunding.sol"
4. Wait for successful compilation (green checkmark)

### 2.4 Deploy to Sepolia

1. Click on "Deploy & Run Transactions" icon (left sidebar, 4th icon)
2. In "ENVIRONMENT" dropdown, select **"Injected Provider - MetaMask"**
3. MetaMask popup will appear - click "Connect"
4. Verify you see "Sepolia (11155111)" as the network
5. Select "CrowdFunding" in the CONTRACT dropdown
6. Click the orange "Deploy" button
7. MetaMask will popup - review gas fees and click "Confirm"
8. Wait for deployment (you'll see a success message in the console)

### 2.5 Copy Contract Address

1. After deployment, look at the "Deployed Contracts" section at the bottom
2. You'll see your contract with an address like `0x1234...abcd`
3. Click the copy icon next to the address
4. **Save this address** - you'll need it for the frontend

## Step 3: Configure Frontend

### 3.1 Update Contract Address

1. Open `config.js` in your project folder
2. Find the line: `contractAddress: "YOUR_CONTRACT_ADDRESS_HERE",`
3. Replace `YOUR_CONTRACT_ADDRESS_HERE` with your deployed contract address
4. Example: `contractAddress: "0x1234567890abcdef1234567890abcdef12345678",`
5. Save the file

### 3.2 Verify ABI (Already Included)

The contract ABI is already included in `config.js`. No changes needed unless you modified the contract.

## Step 4: Run the DApp

### 4.1 Open the Application

1. Navigate to your project folder
2. Double-click `index.html` to open in your browser
3. Or right-click → Open with → Your preferred browser

### 4.2 Connect MetaMask

1. Click the "Connect MetaMask" button
2. MetaMask popup will appear
3. Select your account and click "Connect"
4. If prompted about network, confirm you're on Sepolia

### 4.3 Verify Connection

You should see:
- Your wallet address displayed
- "Network: Sepolia Testnet"
- Campaign statistics (initially 0 ETH, 0 contributors)
- Contribution form
- If you're the deployer, you'll also see "Create Spending Request" form

## Step 5: Test the DApp

### Test 1: Make a Contribution

1. In the "Make a Contribution" section
2. Enter amount (e.g., 0.01)
3. Click "Contribute"
4. Confirm transaction in MetaMask
5. Wait for confirmation
6. Verify total funds and contributors count updated

### Test 2: Create a Spending Request (Manager Only)

1. In "Create Spending Request" section
2. Enter description (e.g., "Marketing expenses")
3. Enter amount (e.g., 0.005)
4. Enter recipient address (use another wallet address)
5. Click "Create Request"
6. Confirm transaction in MetaMask
7. Verify request appears in "Spending Requests" section

### Test 3: Vote on Request

1. Switch to a different MetaMask account (one that contributed)
2. Refresh the page and reconnect
3. Find the request in "Spending Requests"
4. Click "Approve" or "Reject"
5. Confirm transaction
6. Verify vote count updated

### Test 4: Finalize Request

1. Switch back to manager account
2. Get >50% approvals (if 2 contributors, need 2 approvals)
3. Click "Finalize" on the approved request
4. Confirm transaction
5. Verify:
   - Request marked as "Completed"
   - Funds transferred to recipient
   - Total funds in campaign decreased

## Common Issues and Solutions

### Issue: "Please switch to Sepolia Testnet"

**Solution:**
1. Open MetaMask
2. Click network dropdown at top
3. Select "Sepolia test network"
4. If not visible, enable "Show test networks" in MetaMask settings

### Issue: "Failed to connect wallet"

**Solution:**
1. Refresh the page
2. Make sure MetaMask is unlocked
3. Try disconnecting and reconnecting in MetaMask settings

### Issue: "Transaction failed"

**Solution:**
1. Check you have enough Sepolia ETH for gas fees
2. Verify you're calling the right function (e.g., only manager can create requests)
3. Check if you've already voted on that request

### Issue: "Only contributors can vote"

**Solution:**
1. Make sure you've contributed ETH first
2. Verify you're using the same account that contributed

### Issue: "Majority approval required"

**Solution:**
1. You need >50% of total contributors to approve
2. Example: If 3 contributors, need at least 2 approvals
3. Get more contributors to approve the request

## Next Steps

1. **Test with Multiple Accounts**
   - Create multiple MetaMask accounts
   - Contribute from each account
   - Test voting with different accounts

2. **Monitor Transactions**
   - View transactions on Sepolia Etherscan
   - URL: https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS

3. **Share with Others**
   - Share your contract address
   - Others can contribute and vote using their MetaMask wallets

## Important Reminders

⚠️ **Save your contract address** - You'll need it to interact with the contract  
⚠️ **Keep some Sepolia ETH** - You need it for transaction gas fees  
⚠️ **Test thoroughly** - Try all features before sharing with others  
⚠️ **This is testnet** - Sepolia ETH has no real value  

## Support

If you encounter issues:
1. Check the browser console for error messages (F12)
2. Verify contract address in `config.js` is correct
3. Ensure you're on Sepolia testnet
4. Make sure you have enough Sepolia ETH for gas

---

**Congratulations!** 🎉 Your decentralized crowd-funding dApp is now live on Sepolia testnet!
