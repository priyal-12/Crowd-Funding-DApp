// Global variables
let web3;
let contract;
let currentAccount;
let isManager = false;

// Initialize on page load
window.addEventListener('load', async () => {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
    } else {
        showStatus('Please install MetaMask to use this dApp', 'error');
    }

    // Setup event listeners
    document.getElementById('connectBtn').addEventListener('click', connectWallet);
    document.getElementById('contributeBtn').addEventListener('click', contribute);
    document.getElementById('createRequestBtn').addEventListener('click', createRequest);
});

/**
 * Connect to MetaMask wallet
 */
async function connectWallet() {
    try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];

        // Initialize Web3
        web3 = new Web3(window.ethereum);

        // Check if connected to Sepolia
        const chainId = await web3.eth.getChainId();
        if (chainId !== 11155111) { // Sepolia chain ID
            showStatus('Wrong network detected. Requesting switch to Sepolia...', 'info');

            try {
                // Request to switch to Sepolia
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID in hex
                });

                // Retry connection after switch
                showStatus('Network switched! Reconnecting...', 'success');
                setTimeout(() => connectWallet(), 1000);
                return;
            } catch (switchError) {
                // This error code indicates that the chain has not been added to MetaMask
                if (switchError.code === 4902) {
                    showStatus('Please add Sepolia network to MetaMask manually', 'error');
                } else {
                    showStatus('Please switch to Sepolia Testnet in MetaMask manually', 'error');
                }
                return;
            }
        }

        // Initialize contract
        contract = new web3.eth.Contract(CONFIG.contractABI, CONFIG.contractAddress);

        // Update UI
        document.getElementById('walletAddress').textContent = currentAccount.substring(0, 6) + '...' + currentAccount.substring(38);
        document.getElementById('networkName').textContent = CONFIG.sepoliaNetworkName;
        document.getElementById('walletInfo').style.display = 'block';
        document.getElementById('campaignStats').style.display = 'block';
        document.getElementById('contributeSection').style.display = 'block';
        document.getElementById('requestsSection').style.display = 'block';

        // Load campaign data
        await loadCampaignData();
        await loadRequests();

        // Check if current user is manager
        const manager = await contract.methods.manager().call();
        isManager = manager.toLowerCase() === currentAccount.toLowerCase();

        if (isManager) {
            document.getElementById('createRequestSection').style.display = 'block';
        }

        showStatus('Connected successfully!', 'success');

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                showStatus('Please connect to MetaMask', 'error');
            } else {
                location.reload();
            }
        });

        // Listen for chain changes
        window.ethereum.on('chainChanged', () => {
            location.reload();
        });

    } catch (error) {
        console.error('Error connecting wallet:', error);
        showStatus('Failed to connect wallet: ' + error.message, 'error');
    }
}

/**
 * Load campaign statistics
 */
async function loadCampaignData() {
    try {
        const totalFunds = await contract.methods.totalFunds().call();
        const totalContributors = await contract.methods.totalContributors().call();
        const manager = await contract.methods.manager().call();

        document.getElementById('totalFunds').textContent = web3.utils.fromWei(totalFunds, 'ether') + ' ETH';
        document.getElementById('totalContributors').textContent = totalContributors;
        document.getElementById('managerAddress').textContent = manager.substring(0, 6) + '...' + manager.substring(38);

    } catch (error) {
        console.error('Error loading campaign data:', error);
    }
}

/**
 * Contribute ETH to the campaign
 */
async function contribute() {
    try {
        const amount = document.getElementById('contributeAmount').value;

        if (!amount || amount <= 0) {
            showStatus('Please enter a valid amount', 'error');
            return;
        }

        const amountWei = web3.utils.toWei(amount, 'ether');

        showStatus('Processing transaction...', 'info');

        await contract.methods.contribute().send({
            from: currentAccount,
            value: amountWei
        });

        showStatus('Contribution successful!', 'success');

        // Clear input and reload data
        document.getElementById('contributeAmount').value = '';
        await loadCampaignData();

    } catch (error) {
        console.error('Error contributing:', error);
        showStatus('Contribution failed: ' + error.message, 'error');
    }
}

/**
 * Create a spending request (manager only)
 */
async function createRequest() {
    try {
        const description = document.getElementById('requestDescription').value;
        const amount = document.getElementById('requestAmount').value;
        const recipient = document.getElementById('requestRecipient').value;

        if (!description || !amount || !recipient) {
            showStatus('Please fill all fields', 'error');
            return;
        }

        if (amount <= 0) {
            showStatus('Amount must be greater than 0', 'error');
            return;
        }

        const amountWei = web3.utils.toWei(amount, 'ether');

        showStatus('Creating request...', 'info');

        await contract.methods.createRequest(description, amountWei, recipient).send({
            from: currentAccount
        });

        showStatus('Request created successfully!', 'success');

        // Clear inputs and reload requests
        document.getElementById('requestDescription').value = '';
        document.getElementById('requestAmount').value = '';
        document.getElementById('requestRecipient').value = '';
        await loadRequests();

    } catch (error) {
        console.error('Error creating request:', error);
        showStatus('Failed to create request: ' + error.message, 'error');
    }
}

/**
 * Load all spending requests
 */
async function loadRequests() {
    try {
        const requestCount = await contract.methods.requestCount().call();
        const requestsList = document.getElementById('requestsList');
        requestsList.innerHTML = '';

        if (requestCount == 0) {
            requestsList.innerHTML = '<p style="text-align: center; opacity: 0.7;">No spending requests yet</p>';
            return;
        }

        for (let i = 0; i < requestCount; i++) {
            const request = await contract.methods.getRequest(i).call();
            const hasVoted = await contract.methods.hasVoted(i, currentAccount).call();

            const requestDiv = document.createElement('div');
            requestDiv.className = 'request-item';

            const statusClass = request.completed ? 'status-completed' : 'status-pending';
            const statusText = request.completed ? 'Completed' : 'Pending';

            requestDiv.innerHTML = `
                <div class="request-header">
                    <div class="request-title">Request #${i}</div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="request-details">
                    <p><strong>Description:</strong> ${request.description}</p>
                    <p><strong>Amount:</strong> ${web3.utils.fromWei(request.amount, 'ether')} ETH</p>
                    <p><strong>Recipient:</strong> ${request.recipient}</p>
                    <p><strong>Approvals:</strong> ${request.approvalCount} | <strong>Rejections:</strong> ${request.rejectCount}</p>
                </div>
                <div class="request-actions" id="actions-${i}">
                </div>
            `;

            requestsList.appendChild(requestDiv);

            const actionsDiv = document.getElementById(`actions-${i}`);

            // Show voting buttons if not completed and not voted
            if (!request.completed && !hasVoted) {
                const approveBtn = document.createElement('button');
                approveBtn.className = 'btn-approve';
                approveBtn.textContent = 'Approve';
                approveBtn.onclick = () => approveRequest(i);
                actionsDiv.appendChild(approveBtn);

                const rejectBtn = document.createElement('button');
                rejectBtn.className = 'btn-reject';
                rejectBtn.textContent = 'Reject';
                rejectBtn.onclick = () => rejectRequest(i);
                actionsDiv.appendChild(rejectBtn);
            }

            // Show finalize button for manager if not completed
            if (!request.completed && isManager) {
                const finalizeBtn = document.createElement('button');
                finalizeBtn.className = 'btn-finalize';
                finalizeBtn.textContent = 'Finalize';
                finalizeBtn.onclick = () => finalizeRequest(i);
                actionsDiv.appendChild(finalizeBtn);
            }

            if (hasVoted && !request.completed) {
                const votedText = document.createElement('span');
                votedText.textContent = 'You have voted';
                votedText.style.opacity = '0.7';
                actionsDiv.appendChild(votedText);
            }
        }

    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

/**
 * Approve a spending request
 */
async function approveRequest(requestId) {
    try {
        showStatus('Processing vote...', 'info');

        await contract.methods.approveRequest(requestId).send({
            from: currentAccount
        });

        showStatus('Vote recorded successfully!', 'success');
        await loadRequests();

    } catch (error) {
        console.error('Error approving request:', error);
        showStatus('Failed to approve: ' + error.message, 'error');
    }
}

/**
 * Reject a spending request
 */
async function rejectRequest(requestId) {
    try {
        showStatus('Processing vote...', 'info');

        await contract.methods.rejectRequest(requestId).send({
            from: currentAccount
        });

        showStatus('Vote recorded successfully!', 'success');
        await loadRequests();

    } catch (error) {
        console.error('Error rejecting request:', error);
        showStatus('Failed to reject: ' + error.message, 'error');
    }
}

/**
 * Finalize a spending request (manager only)
 */
async function finalizeRequest(requestId) {
    try {
        showStatus('Finalizing request...', 'info');

        await contract.methods.finalizeRequest(requestId).send({
            from: currentAccount
        });

        showStatus('Request finalized and funds released!', 'success');
        await loadCampaignData();
        await loadRequests();

    } catch (error) {
        console.error('Error finalizing request:', error);
        showStatus('Failed to finalize: ' + error.message, 'error');
    }
}

/**
 * Show status message to user
 */
function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message status-' + type;
    statusDiv.style.display = 'block';

    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}
