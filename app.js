// Global variables
let web3;
let contract;
let currentAccount;
let isManager = false;
let milestoneCountInput = 1;
let currentProofId = null;

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
    document.getElementById('addMilestoneBtn').addEventListener('click', addMilestoneField);
    document.getElementById('createCampaignBtn').addEventListener('click', createCampaign);
    document.getElementById('submitProofBtn').addEventListener('click', submitProof);
    document.getElementById('cancelProofBtn').addEventListener('click', () => {
        document.getElementById('submitProofSection').style.display = 'none';
    });
});

/**
 * Connect to MetaMask wallet
 */
async function connectWallet() {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];

        web3 = new Web3(window.ethereum);

        const chainId = await web3.eth.getChainId();
        if (chainId !== 11155111) { // Sepolia
            showStatus('Wrong network detected. Please switch to Sepolia.', 'error');
            return;
        }

        contract = new web3.eth.Contract(CONFIG.contractABI, CONFIG.contractAddress);

        // Update UI
        document.getElementById('walletAddress').textContent = currentAccount.substring(0, 6) + '...' + currentAccount.substring(38);
        document.getElementById('networkName').textContent = CONFIG.sepoliaNetworkName;
        document.getElementById('walletInfo').style.display = 'block';
        document.getElementById('campaignStats').style.display = 'block';
        document.getElementById('contributeSection').style.display = 'block';

        await loadCampaignData();

        const manager = await contract.methods.manager().call();
        isManager = manager.toLowerCase() === currentAccount.toLowerCase();
        
        const campaignCreated = await contract.methods.campaignCreated().call();

        if (isManager && !campaignCreated) {
            document.getElementById('createCampaignSection').style.display = 'block';
        }
        
        if (campaignCreated) {
            document.getElementById('milestonesSection').style.display = 'block';
            await loadMilestones();
        }

        showStatus('Connected successfully!', 'success');

        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) location.reload();
            else location.reload();
        });
        window.ethereum.on('chainChanged', () => location.reload());

    } catch (error) {
        console.error(error);
        showStatus('Failed to connect wallet: ' + error.message, 'error');
    }
}

/**
 * Load campaign statistics
 */
async function loadCampaignData() {
    try {
        const balance = await contract.methods.getBalance().call();
        const totalContributors = await contract.methods.totalContributors().call();
        const manager = await contract.methods.manager().call();

        document.getElementById('totalFunds').textContent = web3.utils.fromWei(balance, 'ether') + ' ETH';
        document.getElementById('totalContributors').textContent = totalContributors;
        document.getElementById('managerAddress').textContent = manager.substring(0, 6) + '...' + manager.substring(38);
    } catch (error) {
        console.error(error);
    }
}

/**
 * Contribute ETH to the campaign
 */
async function contribute() {
    try {
        const amount = document.getElementById('contributeAmount').value;
        if (!amount || amount <= 0) return showStatus('Please enter a valid amount', 'error');

        const amountWei = web3.utils.toWei(amount, 'ether');
        showStatus('Processing transaction...', 'info');

        await contract.methods.contribute().send({ from: currentAccount, value: amountWei });

        showStatus('Contribution successful!', 'success');
        document.getElementById('contributeAmount').value = '';
        await loadCampaignData();
    } catch (error) {
        showStatus('Contribution failed: ' + error.message, 'error');
    }
}

function addMilestoneField() {
    if (milestoneCountInput >= 5) {
        showStatus('Maximum 5 milestones allowed.', 'error');
        return;
    }
    
    const container = document.getElementById('milestoneInputsContainer');
    const newGroupId = `milestoneInput-${milestoneCountInput}`;
    
    const div = document.createElement('div');
    div.className = 'milestone-input-group card';
    div.style.backgroundColor = 'var(--secondary-color)';
    div.id = newGroupId;
    div.innerHTML = `
        <h3 style="margin-top: 0;">Milestone ${milestoneCountInput + 1}</h3>
        <div class="form-group">
            <label>Title</label>
            <input type="text" class="m-title" placeholder="e.g., Output Delivery">
        </div>
        <div class="form-group">
            <label>Description</label>
            <input type="text" class="m-desc" placeholder="Details">
        </div>
        <div class="form-group">
            <label>Amount (ETH)</label>
            <input type="number" class="m-amount" placeholder="0.1" step="0.001" min="0.001">
        </div>
        <div class="form-group">
            <label>Beneficiary Address</label>
            <input type="text" class="m-beneficiary" placeholder="0x...">
        </div>
    `;
    container.appendChild(div);
    milestoneCountInput++;
}

async function createCampaign() {
    try {
        const titles = [];
        const descriptions = [];
        const amounts = [];
        const beneficiaries = [];
        
        let valid = true;
        
        for (let i = 0; i < milestoneCountInput; i++) {
            const group = document.getElementById(`milestoneInput-${i}`);
            const title = group.querySelector('.m-title').value;
            const desc = group.querySelector('.m-desc').value;
            const amount = group.querySelector('.m-amount').value;
            const bAddress = group.querySelector('.m-beneficiary').value;
            
            if (!title || !desc || !amount || !bAddress) {
                valid = false;
                break;
            }
            
            titles.push(title);
            descriptions.push(desc);
            amounts.push(web3.utils.toWei(amount, 'ether'));
            beneficiaries.push(bAddress);
        }
        
        if (!valid) {
            showStatus('Please fill all fields for all milestones.', 'error');
            return;
        }

        showStatus('Creating Campaign...', 'info');

        await contract.methods.createCampaign(titles, descriptions, amounts, beneficiaries).send({
            from: currentAccount
        });

        showStatus('Campaign created successfully!', 'success');
        document.getElementById('createCampaignSection').style.display = 'none';
        
        // Reload page to show milestones
        location.reload();
        
    } catch (error) {
        showStatus('Failed to create campaign: ' + error.message, 'error');
    }
}

const statusTextMap = ["Pending", "Under Review", "Approved", "Rejected", "Released"];

async function loadMilestones() {
    try {
        const count = await contract.methods.getMilestonesCount().call();
        const currentMilestoneIndex = await contract.methods.currentMilestoneIndex().call();
        const mList = document.getElementById('milestonesList');
        mList.innerHTML = '';
        
        let campaignGoalWei = web3.utils.toBN('0');

        for (let i = 0; i < count; i++) {
            const m = await contract.methods.getMilestone(i).call();
            const hasVoted = await contract.methods.hasVoted(i, currentAccount).call();
            
            campaignGoalWei = campaignGoalWei.add(web3.utils.toBN(m.amount));
            
            const reqDiv = document.createElement('div');
            reqDiv.className = 'request-item';

            let sClass = 'status-pending';
            if (m.status == 1) sClass = 'status-review'; // UnderReview
            else if (m.status == 2) sClass = 'status-completed'; // Approved
            else if (m.status == 3) sClass = 'status-reject'; // Rejected
            else if (m.status == 4) sClass = 'status-completed'; // Released
            
            const isCurrent = i == currentMilestoneIndex;
            let currentBadge = isCurrent ? '<span style="color:var(--primary-color); font-weight:bold; margin-left:10px;">[Active]</span>' : '';

            reqDiv.innerHTML = `
                <div class="request-header">
                    <div class="request-title">${m.title} ${currentBadge}</div>
                    <span class="status-badge ${sClass}">${statusTextMap[m.status]}</span>
                </div>
                <div class="request-details">
                    <p><strong>Description:</strong> ${m.description}</p>
                    <p><strong>Amount Allocated:</strong> ${web3.utils.fromWei(m.amount, 'ether')} ETH</p>
                    <p><strong>Beneficiary:</strong> <span style="font-family: monospace; font-size: 0.9em; background: #F3F4F6; padding: 2px 6px; border-radius: 4px;">${m.beneficiary}</span></p>
                    ${m.proof ? `<p style="margin-top: 10px;"><strong>Proof Submitted:</strong> <a href="${m.proof}" target="_blank" class="proof-link">View Proof</a></p>` : ''}
                    <div class="voting-results">
                        <p><strong>Voting Power (Total ETH):</strong></p>
                        <p>👍 Yes votes: ${web3.utils.fromWei(m.yesVotes, 'ether')} ETH &nbsp;|&nbsp; 👎 No votes: ${web3.utils.fromWei(m.noVotes, 'ether')} ETH</p>
                    </div>
                </div>
                <div class="request-actions" id="m-actions-${i}"></div>
            `;
            
            mList.appendChild(reqDiv);
            const actionsDiv = document.getElementById(`m-actions-${i}`);

            if (isCurrent) {
                if (isManager && (m.status == 0 || m.status == 3)) { 
                    const prfBtn = document.createElement('button');
                    prfBtn.className = 'btn-primary';
                    prfBtn.textContent = 'Submit Proof';
                    prfBtn.onclick = () => {
                        currentProofId = i;
                        document.getElementById('proofMilestoneIdText').textContent = i + ' - ' + m.title;
                        document.getElementById('submitProofSection').style.display = 'block';
                    };
                    actionsDiv.appendChild(prfBtn);
                }

                if (m.status == 1) { 
                    if (!hasVoted) {
                        const vYesBtn = document.createElement('button');
                        vYesBtn.className = 'btn-approve';
                        vYesBtn.textContent = 'Approve';
                        vYesBtn.onclick = () => voteMilestone(i, true);
                        
                        const vNoBtn = document.createElement('button');
                        vNoBtn.className = 'btn-reject';
                        vNoBtn.textContent = 'Reject';
                        vNoBtn.onclick = () => voteMilestone(i, false);
                        
                        actionsDiv.appendChild(vYesBtn);
                        actionsDiv.appendChild(vNoBtn);
                    } else {
                        actionsDiv.innerHTML += '<span style="opacity: 0.7; font-weight: 500;">You have voted on this milestone.</span>';
                    }
                    
                    if (isManager) {
                        const relBtn = document.createElement('button');
                        relBtn.className = 'btn-finalize';
                        relBtn.textContent = 'Finalize & Release Funds';
                        relBtn.onclick = () => releaseFunds(i);
                        actionsDiv.appendChild(relBtn);
                    }
                }
            } else if (m.status == 4) {
                actionsDiv.innerHTML += '<span style="color: var(--success-color); font-weight: 600;">Funds Released Successfully</span>';
            }
        }
        
        // Update Progress Bar & Goal globally
        const goalEth = web3.utils.fromWei(campaignGoalWei, 'ether');
        const goalEl = document.getElementById('campaignGoal');
        if (goalEl) goalEl.textContent = goalEth + ' ETH';
        
        const totalFunds = await contract.methods.totalFunds().call();
        let percent = 0;
        if (!campaignGoalWei.isZero()) {
            percent = (parseFloat(web3.utils.fromWei(totalFunds, 'ether')) / parseFloat(goalEth)) * 100;
            if (percent > 100) percent = 100;
        }
        const pctText = percent.toFixed(1) + '%';
        const percentEl = document.getElementById('progressPercent');
        const fillEl = document.getElementById('progressFill');
        if (percentEl) percentEl.textContent = pctText;
        if (fillEl) fillEl.style.width = pctText;

    } catch (error) {
        console.error('Error loading milestones:', error);
    }
}

async function submitProof() {
    try {
        const proofLink = document.getElementById('proofInput').value;
        if (!proofLink) return showStatus('Please enter proof link', 'error');
        
        showStatus('Submitting proof...', 'info');
        await contract.methods.submitProof(currentProofId, proofLink).send({ from: currentAccount });
        
        showStatus('Proof submitted! Stage set to Under Review.', 'success');
        document.getElementById('submitProofSection').style.display = 'none';
        document.getElementById('proofInput').value = '';
        await loadMilestones();
    } catch (error) {
        showStatus('Failed: ' + error.message, 'error');
    }
}

async function voteMilestone(id, support) {
    try {
        showStatus('Voting...', 'info');
        await contract.methods.voteOnMilestone(id, support).send({ from: currentAccount });
        showStatus('Vote recorded!', 'success');
        await loadMilestones();
    } catch (error) {
        showStatus('Failed to vote: ' + error.message, 'error');
    }
}

async function releaseFunds(id) {
    try {
        showStatus('Processing fund release...', 'info');
        await contract.methods.releaseFunds(id).send({ from: currentAccount });
        showStatus('Funds Released!', 'success');
        await loadMilestones();
        await loadCampaignData();
    } catch (error) {
        showStatus('Failed: ' + error.message, 'error');
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message status-' + type;
    statusDiv.style.display = 'block';
    setTimeout(() => { statusDiv.style.display = 'none'; }, 5000);
}
