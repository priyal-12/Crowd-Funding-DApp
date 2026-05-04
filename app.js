// Global Variables
let web3;
let contract;
let currentAccount;
let currentCampaignId = null;
let isCreator = false;

const PhaseStatusMap = ["Funding", "Plan Pending", "Voting", "Approved", "Work In Progress", "Completed", "Rejected"];

window.addEventListener('load', async () => {
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask installed');
    }

    // Nav
    document.getElementById('connectBtn').addEventListener('click', connectWallet);
    document.getElementById('homeLogo').addEventListener('click', () => showView('homeView'));
    document.getElementById('navCreateCampaignBtn').addEventListener('click', () => showView('createCampaignView'));
    document.getElementById('backToHomeBtn1').addEventListener('click', () => showView('homeView'));
    document.getElementById('backToHomeBtn2').addEventListener('click', () => showView('homeView'));

    // Create Campaign
    document.getElementById('addPhaseBtn').addEventListener('click', addPhaseField);
    document.getElementById('submitCampaignBtn').addEventListener('click', createCampaign);

    // Actions
    document.getElementById('btnContribute').addEventListener('click', contribute);
    document.getElementById('btnSubmitPlan').addEventListener('click', submitPlan);
    document.getElementById('btnVoteYes').addEventListener('click', () => vote(true));
    document.getElementById('btnVoteNo').addEventListener('click', () => vote(false));
    document.getElementById('btnFinalizeVoting').addEventListener('click', finalizeVoting);
    document.getElementById('btnReleaseFunds').addEventListener('click', releaseFunds);
    document.getElementById('btnSubmitProof').addEventListener('click', submitProof);
    document.getElementById('btnClaimRefund').addEventListener('click', claimRefund);
    document.getElementById('btnResetPhase').addEventListener('click', resetPhase);
    document.getElementById('btnRateCreator').addEventListener('click', rateCreator);
    document.getElementById('btnViewReviews').addEventListener('click', showReviewsModal);
    document.getElementById('closeReviewsBtn').addEventListener('click', () => { document.getElementById('reviewsModal').style.display = 'none'; });

    showView('homeView');
});

function showToast(msg, type = "info") {
    const toast = document.getElementById('toastMessage');
    toast.textContent = msg;
    toast.className = `toast toast-${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 5000);
}

function showView(viewId) {
    document.getElementById('homeView').style.display = 'none';
    document.getElementById('createCampaignView').style.display = 'none';
    document.getElementById('campaignDetailsView').style.display = 'none';
    document.getElementById(viewId).style.display = 'block';

    if (viewId === 'homeView' && contract) {
        loadPlatformData();
    }
}

function showLoading(show, text="Processing...") {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

async function connectWallet() {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
        web3 = new Web3(window.ethereum);

        const chainId = await web3.eth.getChainId();
        if (chainId !== 11155111) {
            showToast('Please switch to Sepolia Testnet.', 'error');
        }

        contract = new web3.eth.Contract(CONFIG.contractABI, CONFIG.contractAddress);

        document.getElementById('walletAddress').textContent = currentAccount.substring(0, 6) + '...' + currentAccount.substring(38);
        document.getElementById('walletInfo').style.display = 'inline-flex';
        document.getElementById('connectBtn').style.display = 'none';

        showToast('Wallet connected!', 'success');
        
        loadPlatformData();

        window.ethereum.on('accountsChanged', () => location.reload());
        window.ethereum.on('chainChanged', () => location.reload());
    } catch (e) {
        showToast('Failed to connect: ' + e.message, 'error');
    }
}

// --- HOME VIEW ---
async function loadPlatformData() {
    if (!contract) return;
    try {
        const count = await contract.methods.campaignCount().call();
        const grid = document.getElementById('campaignsGrid');
        grid.innerHTML = '';

        if (count == 0) {
            grid.innerHTML = '<p style="color:#888;">No campaigns found on the platform yet.</p>';
            return;
        }

        for (let i = 0; i < count; i++) {
            const camp = await contract.methods.campaigns(i).call();
            const pIdx = camp.currentPhaseIndex;
            let statusText = "Completed";
            
            if (pIdx < camp.phasesCount) {
                const phase = await contract.methods.campaignPhases(i, pIdx).call();
                statusText = PhaseStatusMap[phase.status];
            }
            
            const totalGoal = web3.utils.fromWei(camp.totalGoal, 'ether');
            const totalRaised = web3.utils.fromWei(camp.totalFundsRaised, 'ether');
            
            const card = document.createElement('div');
            card.className = 'card campaign-card';
            card.innerHTML = `
                <div class="card-header">
                    <h4>Campaign #${i}</h4>
                    <span class="status-badge" style="font-size:0.75em;">${statusText}</span>
                </div>
                <div class="card-body">
                    <p><strong>Goal:</strong> ${totalGoal} ETH</p>
                    <p><strong>Raised:</strong> ${totalRaised} ETH</p>
                    <p><strong>Phases:</strong> ${pIdx >= camp.phasesCount ? camp.phasesCount : parseInt(pIdx)+1} / ${camp.phasesCount}</p>
                </div>
                <button class="btn-primary btn-full" style="margin-top:15px;" onclick="viewCampaignDetails(${i})">View Details</button>
            `;
            grid.appendChild(card);
        }
    } catch (e) {
        console.error(e);
        showToast('Error loading platform data.', 'error');
    }
}

// --- CREATE CAMPAIGN ---
function addPhaseField() {
    const container = document.getElementById('phaseInputsContainer');
    const idx = container.children.length;
    if (idx >= 10) return showToast('Maximum 10 phases allowed.', 'error');

    const div = document.createElement('div');
    div.className = 'phase-input-group';
    div.id = `phaseInput-${idx}`;
    div.innerHTML = `
        <span class="phase-number">Phase ${idx + 1}</span>
        <input type="number" class="p-amount" placeholder="Target Amount (ETH)" step="0.001" min="0.001">
    `;
    container.appendChild(div);
}

async function createCampaign() {
    if (!contract || !currentAccount) return showToast('Connect wallet first.', 'error');
    
    const ben = document.getElementById('cBeneficiary').value;
    if (!ben || ben.length !== 42) return showToast('Invalid beneficiary address.', 'error');

    const container = document.getElementById('phaseInputsContainer');
    const targets = [];
    for (let i = 0; i < container.children.length; i++) {
        const val = container.children[i].querySelector('.p-amount').value;
        if (!val || val <= 0) return showToast(`Invalid amount in Phase ${i+1}.`, 'error');
        targets.push(web3.utils.toWei(val, 'ether'));
    }

    try {
        showLoading(true, "Deploying Campaign...");
        await contract.methods.createCampaign(ben, targets).send({ from: currentAccount });
        showLoading(false);
        showToast('Campaign created successfully!', 'success');
        showView('homeView');
    } catch (e) {
        showLoading(false);
        showToast('Error: ' + e.message, 'error');
    }
}

// --- CAMPAIGN DETAILS ---
async function viewCampaignDetails(id) {
    if (!contract || !currentAccount) return showToast('Connect wallet first.', 'error');
    currentCampaignId = id;
    showView('campaignDetailsView');
    await loadCampaignDetails(id);
}

async function loadCampaignDetails(id) {
    try {
        const camp = await contract.methods.campaigns(id).call();
        isCreator = (camp.creator.toLowerCase() === currentAccount.toLowerCase());

        document.getElementById('cdId').textContent = id;
        document.getElementById('cdCreator').textContent = camp.creator.substring(0,6)+'...'+camp.creator.substring(38);
        document.getElementById('cdBeneficiary').textContent = camp.beneficiary.substring(0,6)+'...'+camp.beneficiary.substring(38);
        document.getElementById('cdTotalGoal').textContent = web3.utils.fromWei(camp.totalGoal, 'ether') + ' ETH';
        document.getElementById('cdTotalRaised').textContent = web3.utils.fromWei(camp.totalFundsRaised, 'ether') + ' ETH';

        // Load Creator Trust Score
        const points = parseInt(await contract.methods.creatorTotalRatingPoints(camp.creator).call());
        const count = parseInt(await contract.methods.creatorRatingCount(camp.creator).call());
        const starsEl = document.getElementById('cdCreatorStars');
        if (count === 0) {
            starsEl.textContent = "No ratings yet";
        } else {
            const avg = (points / count).toFixed(1);
            starsEl.textContent = `⭐ ${avg} (${count} reviews)`;
        }

        const pIdx = parseInt(camp.currentPhaseIndex);
        const pCount = parseInt(camp.phasesCount);

        // Build Phase Tracker
        const tracker = document.getElementById('phaseTracker');
        tracker.innerHTML = '';
        for (let i = 0; i < pCount; i++) {
            const phase = await contract.methods.campaignPhases(id, i).call();
            const div = document.createElement('div');
            
            let pState = "Upcoming";
            if (i < pIdx) pState = "Completed";
            else if (i === pIdx) pState = "Active";

            div.className = `tracker-item ${pState.toLowerCase()}`;
            div.innerHTML = `
                <div class="tracker-circle">${i+1}</div>
                <div class="tracker-text">Phase ${i+1}<br><small>${web3.utils.fromWei(phase.targetAmount, 'ether')} ETH</small></div>
            `;
            tracker.appendChild(div);
        }

        // Current Phase logic
        const card = document.getElementById('currentPhaseCard');
        if (pIdx >= pCount) {
            document.getElementById('cpNumber').textContent = "All Completed";
            document.getElementById('cpStatusBadge').textContent = "Campaign Finished";
            card.style.opacity = '0.7';
            hideAllForms();
            return;
        }

        card.style.opacity = '1';
        document.getElementById('cpNumber').textContent = `${pIdx + 1} of ${pCount}`;
        
        const phase = await contract.methods.campaignPhases(id, pIdx).call();
        const status = parseInt(phase.status);
        document.getElementById('cpStatusBadge').textContent = PhaseStatusMap[status];

        const targetEth = parseFloat(web3.utils.fromWei(phase.targetAmount, 'ether'));
        const raisedEth = parseFloat(web3.utils.fromWei(phase.totalRaised, 'ether'));
        document.getElementById('cpTargetText').textContent = `of ${targetEth} ETH target`;
        document.getElementById('cpRaisedText').textContent = `${raisedEth} ETH raised`;
        
        const pct = (raisedEth / targetEth) * 100;
        document.getElementById('cpProgressFill').style.width = `${pct}%`;

        // Reset details visibility
        document.getElementById('phasePlanDetails').style.display = 'none';
        document.getElementById('phaseProofDetails').style.display = 'none';
        document.getElementById('votingStats').style.display = 'none';
        hideAllForms();

        // Show specific details based on state
        if (status >= 2 && status !== 6) { // Plan submitted
            document.getElementById('phasePlanDetails').style.display = 'block';
            document.getElementById('cpPlanText').textContent = phase.planDetails;
        }

        if (status === 2 || status === 3 || status === 6) { // Voting stats
            document.getElementById('votingStats').style.display = 'block';
            document.getElementById('cpYesVotes').textContent = phase.yesVotes;
            document.getElementById('cpNoVotes').textContent = phase.noVotes;
            document.getElementById('cpTotalVoters').textContent = phase.totalVoters;
        }

        if (status === 5) { // Completed proof
            document.getElementById('phaseProofDetails').style.display = 'block';
            document.getElementById('cpProofLink').href = phase.proofOfWork;
        }

        // Show Forms
        if (status === 0) { // Funding
            document.getElementById('formContribute').style.display = 'block';
        } 
        else if (status === 1) { // PlanPending
            if (isCreator) document.getElementById('formSubmitPlan').style.display = 'block';
            else showActionMsg("Waiting for creator to submit phase plan.");
        }
        else if (status === 2) { // Voting
            const myAttempt = await contract.methods.phaseAttempts(id, pIdx).call();
            const hasVoted = await contract.methods.hasVoted(id, pIdx, myAttempt, currentAccount).call();
            const myContribution = await contract.methods.phaseContributions(id, pIdx, currentAccount).call();
            
            if (myContribution > 0 && !hasVoted) {
                document.getElementById('formVote').style.display = 'block';
            } else if (hasVoted) {
                showActionMsg("You have cast your vote.");
            } else {
                showActionMsg("Only contributors to this phase can vote.");
            }

            if (isCreator) {
                document.getElementById('formFinalize').style.display = 'block';
            }
        }
        else if (status === 3) { // Approved
            if (isCreator) document.getElementById('formReleaseFunds').style.display = 'block';
            else showActionMsg("Plan approved. Waiting for creator to release funds to beneficiary.");
        }
        else if (status === 4) { // WorkInProgress
            if (isCreator) document.getElementById('formSubmitProof').style.display = 'block';
            else showActionMsg("Funds released. Work in progress. Waiting for proof from creator.");
        }
        else if (status === 6) { // Rejected
            const myContribution = await contract.methods.phaseContributions(id, pIdx, currentAccount).call();
            if (myContribution > 0) {
                document.getElementById('formRefund').style.display = 'block';
            }
            if (isCreator) {
                document.getElementById('formResetPhase').style.display = 'block';
            }
        }

        // Rate Creator Form Logic
        let hasContributedToAnyPhase = false;
        for (let i = 0; i < pCount; i++) {
            const myContribution = await contract.methods.phaseContributions(id, i, currentAccount).call();
            if (myContribution > 0) {
                hasContributedToAnyPhase = true;
                break;
            }
        }

        const hasRated = await contract.methods.hasRatedCampaign(id, currentAccount).call();
        if (hasContributedToAnyPhase && !hasRated && !isCreator) {
            document.getElementById('formRateCreator').style.display = 'block';
        }

    } catch (e) {
        console.error(e);
        showToast('Failed to load campaign details.', 'error');
    }
}

function hideAllForms() {
    const forms = document.querySelectorAll('.dynamic-form');
    forms.forEach(f => f.style.display = 'none');
    document.getElementById('actionMessage').style.display = 'none';
}

function showActionMsg(msg) {
    const el = document.getElementById('actionMessage');
    el.textContent = msg;
    el.style.display = 'block';
}

// --- CONTRACT ACTIONS ---
async function executeAction(actionName, promise) {
    try {
        showLoading(true, `${actionName}...`);
        await promise;
        showToast(`${actionName} successful!`, 'success');
        await loadCampaignDetails(currentCampaignId);
    } catch (e) {
        showToast(`Failed: ${e.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function contribute() {
    const amount = document.getElementById('contributeAmount').value;
    if (!amount || amount <= 0) return showToast('Invalid amount', 'error');
    const val = web3.utils.toWei(amount, 'ether');
    await executeAction('Contribution', contract.methods.contribute(currentCampaignId).send({ from: currentAccount, value: val }));
}

async function submitPlan() {
    const text = document.getElementById('planDetailsInput').value;
    if (!text) return showToast('Plan details required', 'error');
    await executeAction('Submit Plan', contract.methods.submitPlan(currentCampaignId, text).send({ from: currentAccount }));
}

async function vote(support) {
    await executeAction('Voting', contract.methods.vote(currentCampaignId, support).send({ from: currentAccount }));
}

async function finalizeVoting() {
    await executeAction('Finalize Voting', contract.methods.finalizeVoting(currentCampaignId).send({ from: currentAccount }));
}

async function releaseFunds() {
    await executeAction('Release Funds', contract.methods.releaseFunds(currentCampaignId).send({ from: currentAccount }));
}

async function submitProof() {
    const url = document.getElementById('proofUrlInput').value;
    if (!url) return showToast('Proof URL required', 'error');
    await executeAction('Submit Proof', contract.methods.submitProof(currentCampaignId, url).send({ from: currentAccount }));
}

async function claimRefund() {
    await executeAction('Claim Refund', contract.methods.claimRefund(currentCampaignId).send({ from: currentAccount }));
}

async function resetPhase() {
    await executeAction('Reset Phase', contract.methods.resetPhase(currentCampaignId).send({ from: currentAccount }));
}

async function rateCreator() {
    const rating = document.getElementById('creatorRatingInput').value;
    const feedback = document.getElementById('creatorFeedbackInput').value;
    await executeAction('Submit Rating', contract.methods.rateCreator(currentCampaignId, rating, feedback).send({ from: currentAccount }));
}

async function showReviewsModal() {
    if (!contract || currentCampaignId === null) return;
    try {
        const camp = await contract.methods.campaigns(currentCampaignId).call();
        const creator = camp.creator;
        const count = await contract.methods.getCreatorReviewsCount(creator).call();
        
        const list = document.getElementById('reviewsList');
        list.innerHTML = '';
        
        if (count == 0) {
            list.innerHTML = '<p style="padding:15px; text-align:center; color:#9CA3AF;">No reviews found for this creator.</p>';
        } else {
            for (let i = 0; i < count; i++) {
                const r = await contract.methods.getCreatorReview(creator, i).call();
                const stars = '⭐'.repeat(r[2]);
                list.innerHTML += `
                    <div class="review-item">
                        <div class="review-header">
                            <span class="review-stars">${stars}</span>
                            <span class="address-mono" style="font-size:0.8rem;">By: ${r[1].substring(0,6)}...${r[1].substring(38)}</span>
                        </div>
                        <p class="review-feedback">"${r[3] || 'No text feedback provided.'}"</p>
                    </div>
                `;
            }
        }
        
        document.getElementById('reviewsModal').style.display = 'flex';
    } catch (e) {
        showToast('Failed to load reviews.', 'error');
    }
}
