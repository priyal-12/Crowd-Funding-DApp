// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title CrowdFundingPlatform
 * @dev Decentralized platform for phase-based, milestone-driven crowdfunding campaigns.
 */
contract CrowdFundingPlatform {
    address public admin;
    bool public paused;

    enum PhaseStatus { Funding, PlanPending, Voting, Approved, WorkInProgress, Completed, Rejected }

    struct Phase {
        uint targetAmount;
        uint totalRaised;
        string planDetails; // Objectives, timeline, deliverables
        uint yesVotes; // Count of contributors who voted yes
        uint noVotes;  // Count of contributors who voted no
        string proofOfWork;
        PhaseStatus status;
        uint totalVoters;
    }

    struct Campaign {
        address creator;
        address payable beneficiary;
        uint totalGoal;
        uint totalFundsRaised; // Current total across all phases (decreases on refunds)
        uint currentPhaseIndex;
        uint phasesCount;
    }

    struct Review {
        uint campaignId;
        address reviewer;
        uint8 rating; // 1-5
        string feedback;
    }

    mapping(uint => Campaign) public campaigns;
    uint public campaignCount;

    // Creator Reviews
    mapping(address => Review[]) public creatorReviews;
    mapping(address => uint) public creatorTotalRatingPoints;
    mapping(address => uint) public creatorRatingCount;
    // campaignId => contributor => hasRated
    mapping(uint => mapping(address => bool)) public hasRatedCampaign;

    // campaignId => phaseIndex => Phase
    mapping(uint => mapping(uint => Phase)) public campaignPhases;

    // campaignId => phaseIndex => contributor => amount
    mapping(uint => mapping(uint => mapping(address => uint))) public phaseContributions;

    // campaignId => phaseIndex => attempt => contributor => hasVoted
    mapping(uint => mapping(uint => mapping(uint => mapping(address => bool)))) public hasVoted;
    
    // campaignId => phaseIndex => current attempt nonce (used for resetting votes)
    mapping(uint => mapping(uint => uint)) public phaseAttempts;

    modifier onlyAdmin() { require(msg.sender == admin, "Not admin"); _; }
    modifier whenNotPaused() { require(!paused, "Platform is paused"); _; }
    modifier onlyCreator(uint _id) { require(msg.sender == campaigns[_id].creator, "Not campaign creator"); _; }

    constructor() { admin = msg.sender; }

    function pause() external onlyAdmin { paused = true; }
    function unpause() external onlyAdmin { paused = false; }

    /**
     * @dev Create a new phase-based campaign
     * @param _beneficiary Address that will receive funds
     * @param _phaseTargets Array of ETH targets for each phase in wei
     */
    function createCampaign(address payable _beneficiary, uint[] memory _phaseTargets) external whenNotPaused {
        require(_beneficiary != address(0) && _beneficiary != msg.sender, "Beneficiary cannot be zero or creator");
        require(_phaseTargets.length > 0 && _phaseTargets.length <= 10, "Invalid phases count (1-10)");
        
        uint totalGoal = 0;
        uint id = campaignCount++;
        
        Campaign storage c = campaigns[id];
        c.creator = msg.sender;
        c.beneficiary = _beneficiary;
        c.phasesCount = _phaseTargets.length;
        
        for(uint i = 0; i < _phaseTargets.length; i++) {
            require(_phaseTargets[i] > 0, "Phase target must be > 0");
            totalGoal += _phaseTargets[i];
            Phase storage p = campaignPhases[id][i];
            p.targetAmount = _phaseTargets[i];
            if(i == 0) p.status = PhaseStatus.Funding;
        }
        c.totalGoal = totalGoal;
    }

    /**
     * @dev Contribute to the current open phase
     */
    function contribute(uint _id) external payable whenNotPaused {
        Campaign storage c = campaigns[_id];
        uint pIdx = c.currentPhaseIndex;
        require(pIdx < c.phasesCount, "Campaign is completed");
        
        Phase storage p = campaignPhases[_id][pIdx];
        require(p.status == PhaseStatus.Funding, "Phase is not currently accepting funds");
        
        uint remaining = p.targetAmount - p.totalRaised;
        require(msg.value > 0, "Contribution must be > 0");
        require(msg.value <= remaining, "Contribution exceeds current phase limit");
        
        p.totalRaised += msg.value;
        c.totalFundsRaised += msg.value;
        phaseContributions[_id][pIdx][msg.sender] += msg.value;
        
        if (p.totalRaised == p.targetAmount) {
            p.status = PhaseStatus.PlanPending;
        }
    }

    /**
     * @dev Creator submits the plan for the fully funded phase
     */
    function submitPlan(uint _id, string memory _planDetails) external onlyCreator(_id) whenNotPaused {
        Campaign storage c = campaigns[_id];
        uint pIdx = c.currentPhaseIndex;
        Phase storage p = campaignPhases[_id][pIdx];
        
        require(p.status == PhaseStatus.PlanPending, "Phase not ready for plan submission");
        p.planDetails = _planDetails;
        p.status = PhaseStatus.Voting;
    }

    /**
     * @dev Contributors vote on the submitted plan (1 contributor = 1 vote)
     */
    function vote(uint _id, bool _support) external whenNotPaused {
        Campaign storage c = campaigns[_id];
        uint pIdx = c.currentPhaseIndex;
        Phase storage p = campaignPhases[_id][pIdx];
        
        require(p.status == PhaseStatus.Voting, "Phase not in voting state");
        require(phaseContributions[_id][pIdx][msg.sender] > 0, "Only contributors to this phase can vote");
        
        uint attempt = phaseAttempts[_id][pIdx];
        require(!hasVoted[_id][pIdx][attempt][msg.sender], "Already voted on this plan");
        
        hasVoted[_id][pIdx][attempt][msg.sender] = true;
        p.totalVoters++;
        
        if (_support) p.yesVotes++;
        else p.noVotes++;
    }

    /**
     * @dev Finalize voting based on majority rule
     */
    function finalizeVoting(uint _id) external whenNotPaused {
        Campaign storage c = campaigns[_id];
        uint pIdx = c.currentPhaseIndex;
        Phase storage p = campaignPhases[_id][pIdx];
        
        require(p.status == PhaseStatus.Voting, "Phase not in voting state");
        require(msg.sender == c.creator || msg.sender == admin, "Only creator or admin can finalize");
        
        if (p.yesVotes > p.noVotes) {
            p.status = PhaseStatus.Approved;
        } else {
            p.status = PhaseStatus.Rejected;
        }
    }

    /**
     * @dev Release phase funds directly to beneficiary after approval
     */
    function releaseFunds(uint _id) external onlyCreator(_id) whenNotPaused {
        Campaign storage c = campaigns[_id];
        uint pIdx = c.currentPhaseIndex;
        Phase storage p = campaignPhases[_id][pIdx];
        
        require(p.status == PhaseStatus.Approved, "Plan is not approved");
        p.status = PhaseStatus.WorkInProgress;
        
        require(address(this).balance >= p.targetAmount, "Insufficient contract balance");
        c.beneficiary.transfer(p.targetAmount);
    }

    /**
     * @dev Submit proof of work completed
     */
    function submitProof(uint _id, string memory _proof) external onlyCreator(_id) whenNotPaused {
        Campaign storage c = campaigns[_id];
        uint pIdx = c.currentPhaseIndex;
        Phase storage p = campaignPhases[_id][pIdx];
        
        require(p.status == PhaseStatus.WorkInProgress, "Work not in progress");
        p.proofOfWork = _proof;
        p.status = PhaseStatus.Completed;
        
        c.currentPhaseIndex++;
        if (c.currentPhaseIndex < c.phasesCount) {
            campaignPhases[_id][c.currentPhaseIndex].status = PhaseStatus.Funding;
        }
    }

    /**
     * @dev Claim refund if the plan was rejected
     */
    function claimRefund(uint _id) external whenNotPaused {
        Campaign storage c = campaigns[_id];
        uint pIdx = c.currentPhaseIndex;
        Phase storage p = campaignPhases[_id][pIdx];
        
        require(p.status == PhaseStatus.Rejected, "Plan must be rejected to claim refund");
        
        uint amount = phaseContributions[_id][pIdx][msg.sender];
        require(amount > 0, "No contribution to refund");
        
        phaseContributions[_id][pIdx][msg.sender] = 0;
        p.totalRaised -= amount;
        c.totalFundsRaised -= amount;
        
        payable(msg.sender).transfer(amount);
    }
    
    /**
     * @dev Reset a rejected phase cleanly back to Funding
     */
    function resetPhase(uint _id) external onlyCreator(_id) whenNotPaused {
        Campaign storage c = campaigns[_id];
        uint pIdx = c.currentPhaseIndex;
        Phase storage p = campaignPhases[_id][pIdx];
        
        require(p.status == PhaseStatus.Rejected, "Phase must be rejected to reset");
        
        // Return to funding state. If all contributors refunded, totalRaised is 0. 
        // If some left funds, they count towards target Amount.
        p.status = PhaseStatus.Funding;
        p.planDetails = "";
        p.yesVotes = 0;
        p.noVotes = 0;
        p.totalVoters = 0;
        
        phaseAttempts[_id][pIdx]++; // Invalidate old votes
        
        // If no refunds were claimed and target is still met, it immediately goes to PlanPending
        if (p.totalRaised == p.targetAmount) {
            p.status = PhaseStatus.PlanPending;
        }
    }

    function getPlatformBalance() public view returns (uint) {
        return address(this).balance;
    }

    /**
     * @dev Check if a user has contributed to any phase of a campaign
     */
    function hasContributedToCampaign(uint _campaignId, address _user) internal view returns (bool) {
        Campaign storage c = campaigns[_campaignId];
        for (uint i = 0; i < c.phasesCount; i++) {
            if (phaseContributions[_campaignId][i][_user] > 0) return true;
        }
        return false;
    }

    /**
     * @dev Rate a campaign creator (only contributors, once per campaign)
     */
    function rateCreator(uint _campaignId, uint8 _rating, string memory _feedback) external whenNotPaused {
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender != c.creator, "Creator cannot rate themselves");
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");
        require(hasContributedToCampaign(_campaignId, msg.sender), "Must have contributed to rate");
        require(!hasRatedCampaign[_campaignId][msg.sender], "Already rated this campaign");

        hasRatedCampaign[_campaignId][msg.sender] = true;

        Review memory r = Review({
            campaignId: _campaignId,
            reviewer: msg.sender,
            rating: _rating,
            feedback: _feedback
        });

        creatorReviews[c.creator].push(r);
        creatorTotalRatingPoints[c.creator] += _rating;
        creatorRatingCount[c.creator] += 1;
    }

    function getCreatorReviewsCount(address _creator) external view returns (uint) {
        return creatorReviews[_creator].length;
    }

    function getCreatorReview(address _creator, uint _index) external view returns (uint, address, uint8, string memory) {
        Review storage r = creatorReviews[_creator][_index];
        return (r.campaignId, r.reviewer, r.rating, r.feedback);
    }
}
