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
    document.getElementById('navDashboardBtn').addEventListener('click', () => showView('dashboardView'));
    if(document.getElementById('navBuyCryptoBtn')) {
        document.getElementById('navBuyCryptoBtn').addEventListener('click', () => { showView('buyCryptoView'); setupBuyCrypto(); });
    }
    if(document.getElementById('backToDashboardBtn')) {
        document.getElementById('backToDashboardBtn').addEventListener('click', () => showView('dashboardView'));
    }

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
    document.getElementById('dashboardView').style.display = 'none';
    if(document.getElementById('buyCryptoView')) document.getElementById('buyCryptoView').style.display = 'none';
    
    document.getElementById(viewId).style.display = 'block';

    if (viewId === 'homeView' && contract) {
        loadPlatformData();
    }
    if (viewId === 'dashboardView' && contract && currentAccount) {
        loadDashboardData();
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
        document.getElementById('navDashboardBtn').style.display = 'inline-block';

        showToast('Wallet connected!', 'success');
        
        loadPlatformData();
        checkAndPromptPinSetup();

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
        document.getElementById('globalTotalCampaigns').textContent = count;
        
        let totalEth = 0;
        const grid = document.getElementById('campaignsGrid');
        grid.innerHTML = '';

        if (count == 0) {
            grid.innerHTML = '<p style="color:#888; text-align:center; grid-column: 1/-1;">No campaigns found on the platform yet.</p>';
            document.getElementById('globalTotalEth').textContent = '0 ETH';
            return;
        }

        for (let i = 0; i < count; i++) {
            const camp = await contract.methods.campaigns(i).call();
            totalEth += parseFloat(web3.utils.fromWei(camp.totalFundsRaised, 'ether'));
            
            const pIdx = camp.currentPhaseIndex;
            let statusText = "Completed";
            
            if (pIdx < camp.phasesCount) {
                const phase = await contract.methods.campaignPhases(i, pIdx).call();
                statusText = PhaseStatusMap[phase.status];
            }
            
            // Get Trust Score
            const points = parseInt(await contract.methods.creatorTotalRatingPoints(camp.creator).call());
            const rCount = parseInt(await contract.methods.creatorRatingCount(camp.creator).call());
            let trustHTML = '<span style="font-size:0.85rem; color:#9CA3AF;">No Ratings</span>';
            if (rCount > 0) {
                const avg = (points / rCount).toFixed(1);
                trustHTML = `<span style="font-size:0.85rem; color:#FBBF24;">⭐ ${avg}</span>`;
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
                    <p style="display:flex; justify-content:space-between; margin-bottom:5px;"><strong>Goal:</strong> <span>${totalGoal} ETH</span></p>
                    <p style="display:flex; justify-content:space-between; margin-bottom:5px;"><strong>Raised:</strong> <span>${totalRaised} ETH</span></p>
                    <p style="display:flex; justify-content:space-between; margin-bottom:5px;"><strong>Creator Trust:</strong> ${trustHTML}</p>
                </div>
                <button class="btn-primary btn-full" style="margin-top:15px;" onclick="viewCampaignDetails(${i})">View Details</button>
            `;
            grid.appendChild(card);
        }
        
        document.getElementById('globalTotalEth').textContent = totalEth.toFixed(2) + ' ETH';
        
    } catch (e) {
        console.error(e);
        showToast('Error loading platform data.', 'error');
    }
}

// --- DASHBOARD VIEW ---
async function loadDashboardData() {
    if (!contract || !currentAccount) return;
    try {
        const count = await contract.methods.campaignCount().call();
        const myContribList = document.getElementById('dbContributionsList');
        const myCampList = document.getElementById('dbCampaignsList');
        
        myContribList.innerHTML = '';
        myCampList.innerHTML = '';
        
        let contribCount = 0;
        let campCount = 0;

        for (let id = 0; id < count; id++) {
            const camp = await contract.methods.campaigns(id).call();
            const pIdx = parseInt(camp.currentPhaseIndex);
            const pCount = parseInt(camp.phasesCount);
            const isMyCampaign = (camp.creator.toLowerCase() === currentAccount.toLowerCase());
            
            let statusText = "Completed";
            let statusNum = 5;
            let phaseData = null;
            if (pIdx < pCount) {
                phaseData = await contract.methods.campaignPhases(id, pIdx).call();
                statusText = PhaseStatusMap[phaseData.status];
                statusNum = parseInt(phaseData.status);
            }

            // Check if I contributed
            let hasContributed = false;
            let totalMyContribution = 0;
            for (let i = 0; i < pCount; i++) {
                const contrib = parseFloat(web3.utils.fromWei(await contract.methods.phaseContributions(id, i, currentAccount).call(), 'ether'));
                if (contrib > 0) {
                    hasContributed = true;
                    totalMyContribution += contrib;
                }
            }

            // CREATOR LOGIC
            if (isMyCampaign) {
                campCount++;
                let actionHTML = '';
                
                if (statusNum === 1) { // PlanPending
                    actionHTML = `<div class="db-action-needed"><p>Phase Fully Funded!</p><button class="btn-primary btn-small" onclick="viewCampaignDetails(${id})">Submit Work Plan</button></div>`;
                } else if (statusNum === 2) { // Voting
                    actionHTML = `<div class="db-action-needed"><p>Voting in Progress</p><button class="btn-primary btn-small" onclick="viewCampaignDetails(${id})">Finalize Voting (If time passed)</button></div>`;
                } else if (statusNum === 3) { // Approved
                    actionHTML = `<div class="db-action-needed"><p>Plan Approved!</p><button class="btn-primary btn-small" onclick="viewCampaignDetails(${id})">Release Funds</button></div>`;
                } else if (statusNum === 4) { // WorkInProgress
                    actionHTML = `<div class="db-action-needed"><p>Work in Progress</p><button class="btn-primary btn-small" onclick="viewCampaignDetails(${id})">Submit Proof of Work</button></div>`;
                } else if (statusNum === 6) { // Rejected
                    actionHTML = `<div class="db-action-needed"><p>Plan Rejected</p><button class="btn-secondary btn-small" onclick="viewCampaignDetails(${id})">Reset Phase</button></div>`;
                }

                myCampList.innerHTML += `
                    <div class="db-item">
                        <div class="db-item-header">
                            <span class="db-item-title">Campaign #${id}</span>
                            <span class="status-badge" style="font-size:0.7em;">${statusText}</span>
                        </div>
                        <div class="db-item-body">
                            <p>Phase: ${pIdx >= pCount ? pCount : pIdx + 1} / ${pCount}</p>
                            <p>Total Raised: ${web3.utils.fromWei(camp.totalFundsRaised, 'ether')} ETH</p>
                        </div>
                        ${actionHTML}
                        <button class="btn-text" style="margin-top:10px; font-size:0.85rem;" onclick="viewCampaignDetails(${id})">View Details →</button>
                    </div>
                `;
            }

            // CONTRIBUTOR LOGIC
            if (hasContributed) {
                contribCount++;
                let actionHTML = '';
                
                if (statusNum === 2) { // Voting
                    const myAttempt = await contract.methods.phaseAttempts(id, pIdx).call();
                    const hasVoted = await contract.methods.hasVoted(id, pIdx, myAttempt, currentAccount).call();
                    if (!hasVoted) {
                        actionHTML = `<div class="db-action-needed"><p>Action Required: Voting is open!</p><button class="btn-primary btn-small" onclick="viewCampaignDetails(${id})">Vote on Plan</button></div>`;
                    }
                } else if (statusNum === 6) { // Rejected
                    const currentPhaseContrib = parseFloat(web3.utils.fromWei(await contract.methods.phaseContributions(id, pIdx, currentAccount).call(), 'ether'));
                    if (currentPhaseContrib > 0) {
                        actionHTML = `<div class="db-action-needed"><p>Plan Rejected!</p><button class="btn-reject btn-small" onclick="viewCampaignDetails(${id})">Claim Refund</button></div>`;
                    }
                }

                const hasRated = await contract.methods.hasRatedCampaign(id, currentAccount).call();
                if (!hasRated && !isMyCampaign) {
                    actionHTML += `<div class="db-action-needed" style="background:rgba(59, 130, 246, 0.1); border-color:var(--primary-color);"><p style="color:var(--primary-color);">Rate your experience</p><button class="btn-primary btn-small" onclick="viewCampaignDetails(${id})">Rate Creator</button></div>`;
                }

                myContribList.innerHTML += `
                    <div class="db-item">
                        <div class="db-item-header">
                            <span class="db-item-title">Campaign #${id}</span>
                            <span class="status-badge" style="font-size:0.7em;">${statusText}</span>
                        </div>
                        <div class="db-item-body">
                            <p>My Total Contribution: ${totalMyContribution.toFixed(3)} ETH</p>
                        </div>
                        ${actionHTML}
                        <button class="btn-text" style="margin-top:10px; font-size:0.85rem;" onclick="viewCampaignDetails(${id})">View Details →</button>
                    </div>
                `;
            }
        }

        if (contribCount === 0) {
            myContribList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px;">You haven\'t contributed to any campaigns yet.</p>';
        }
        if (campCount === 0) {
            myCampList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px;">You haven\'t created any campaigns yet.</p>';
        }

    } catch (e) {
        console.error(e);
        showToast('Error loading dashboard data.', 'error');
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

    requirePin(async () => {
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
    });
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
    requirePin(async () => {
        const val = web3.utils.toWei(amount, 'ether');
        await executeAction('Contribution', contract.methods.contribute(currentCampaignId).send({ from: currentAccount, value: val }));
    });
}

async function submitPlan() {
    const text = document.getElementById('planDetailsInput').value;
    if (!text) return showToast('Plan details required', 'error');
    requirePin(async () => {
        await executeAction('Submit Plan', contract.methods.submitPlan(currentCampaignId, text).send({ from: currentAccount }));
    });
}

async function vote(support) {
    requirePin(async () => {
        await executeAction('Voting', contract.methods.vote(currentCampaignId, support).send({ from: currentAccount }));
    });
}

async function finalizeVoting() {
    requirePin(async () => {
        await executeAction('Finalize Voting', contract.methods.finalizeVoting(currentCampaignId).send({ from: currentAccount }));
    });
}

async function releaseFunds() {
    requirePin(async () => {
        await executeAction('Release Funds', contract.methods.releaseFunds(currentCampaignId).send({ from: currentAccount }));
    });
}

async function submitProof() {
    const url = document.getElementById('proofUrlInput').value;
    if (!url) return showToast('Proof URL required', 'error');
    requirePin(async () => {
        await executeAction('Submit Proof', contract.methods.submitProof(currentCampaignId, url).send({ from: currentAccount }));
    });
}

async function claimRefund() {
    requirePin(async () => {
        await executeAction('Claim Refund', contract.methods.claimRefund(currentCampaignId).send({ from: currentAccount }));
    });
}

async function resetPhase() {
    requirePin(async () => {
        await executeAction('Reset Phase', contract.methods.resetPhase(currentCampaignId).send({ from: currentAccount }));
    });
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

// --- BUY CRYPTO (DEMO) ---
function setupBuyCrypto() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const select = document.getElementById('fiatCurrency');
    
    // Auto detect region based on timezone
    if (tz.includes('Kolkata') || tz.includes('Asia/Calcutta') || tz.includes('India')) {
        select.value = 'INR';
    } else if (tz.includes('Europe') || tz.includes('Paris') || tz.includes('Berlin')) {
        select.value = 'EUR';
    } else if (tz.includes('London') || tz.includes('GB')) {
        select.value = 'GBP';
    } else {
        select.value = 'USD';
    }
    
    updateCryptoConversion();
}

if(document.getElementById('fiatCurrency')) {
    document.getElementById('fiatCurrency').addEventListener('change', updateCryptoConversion);
}
if(document.getElementById('fiatAmount')) {
    document.getElementById('fiatAmount').addEventListener('input', updateCryptoConversion);
}
if(document.getElementById('btnBuyCrypto')) {
    document.getElementById('btnBuyCrypto').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('fiatAmount').value) || 0;
        if (amount <= 0) {
            showToast("Please enter a valid amount.", "error");
            return;
        }
        showToast("Demo Only: No real transaction was made. This is a simulation.", "info");
    });
}

function updateCryptoConversion() {
    const select = document.getElementById('fiatCurrency');
    const option = select.options[select.selectedIndex];
    const rate = parseFloat(option.getAttribute('data-rate'));
    const sym = option.getAttribute('data-sym');
    
    document.getElementById('currencySymbolDisplay').textContent = sym;
    
    const amount = parseFloat(document.getElementById('fiatAmount').value) || 0;
    const eth = (amount / rate).toFixed(4);
    
    document.getElementById('cryptoAmountDisplay').textContent = eth;
}

// --- SECURITY PIN SYSTEM ---
let pendingActionCallback = null;

async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getPinKey() {
    return `crowdfund_pin_${currentAccount.toLowerCase()}`;
}

async function checkAndPromptPinSetup() {
    if (!currentAccount) return;
    const storedHash = localStorage.getItem(getPinKey());
    if (!storedHash) {
        document.getElementById('pinSetupModal').style.display = 'flex';
    } else {
        requirePin(() => {
            showToast('Wallet connection verified with PIN.', 'success');
        });
    }
}

document.getElementById('btnSetPin').addEventListener('click', async () => {
    const pin1 = document.getElementById('pinSetupInput1').value;
    const pin2 = document.getElementById('pinSetupInput2').value;
    const errEl = document.getElementById('pinSetupError');
    
    if (pin1.length !== 4 || !/^\d{4}$/.test(pin1)) {
        errEl.textContent = 'PIN must be 4 digits.';
        errEl.style.display = 'block';
        return;
    }
    if (pin1 !== pin2) {
        errEl.textContent = 'PINs do not match.';
        errEl.style.display = 'block';
        return;
    }
    
    const hash = await hashPin(pin1);
    localStorage.setItem(getPinKey(), hash);
    
    document.getElementById('pinSetupModal').style.display = 'none';
    document.getElementById('pinSetupInput1').value = '';
    document.getElementById('pinSetupInput2').value = '';
    errEl.style.display = 'none';
    showToast('Security PIN set successfully!', 'success');
});

function requirePin(callback) {
    if (!currentAccount) return showToast('Connect wallet first.', 'error');
    const storedHash = localStorage.getItem(getPinKey());
    
    if (!storedHash) {
        // If they somehow bypassed setup
        document.getElementById('pinSetupModal').style.display = 'flex';
        return;
    }
    
    pendingActionCallback = callback;
    document.getElementById('pinVerifyInput').value = '';
    document.getElementById('pinVerifyError').style.display = 'none';
    document.getElementById('pinVerifyModal').style.display = 'flex';
}

document.getElementById('btnVerifyPin').addEventListener('click', async () => {
    const pin = document.getElementById('pinVerifyInput').value;
    const errEl = document.getElementById('pinVerifyError');
    const storedHash = localStorage.getItem(getPinKey());
    
    const hash = await hashPin(pin);
    if (hash === storedHash) {
        document.getElementById('pinVerifyModal').style.display = 'none';
        if (pendingActionCallback) {
            pendingActionCallback();
            pendingActionCallback = null;
        }
    } else {
        errEl.textContent = 'Incorrect PIN.';
        errEl.style.display = 'block';
    }
});

document.getElementById('closePinVerifyBtn').addEventListener('click', () => {
    document.getElementById('pinVerifyModal').style.display = 'none';
    pendingActionCallback = null;
});

document.getElementById('btnResetPin').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset your PIN? This will clear the current PIN for this wallet on this device.')) {
        localStorage.removeItem(getPinKey());
        document.getElementById('pinVerifyModal').style.display = 'none';
        document.getElementById('pinSetupModal').style.display = 'flex';
    }
});
