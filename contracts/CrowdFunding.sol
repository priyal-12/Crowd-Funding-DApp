// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title CrowdFunding
 * @dev Decentralized crowd-funding contract with Milestone-Based Fund Release
 */
contract CrowdFunding {
    address public manager;
    mapping(address => uint) public contributors;
    uint public totalContributors;
    uint public totalFunds;

    enum MilestoneStatus { Pending, UnderReview, Approved, Rejected, Released }

    struct Milestone {
        string title;
        string description;
        uint amount;
        address payable beneficiary;
        MilestoneStatus status;
        string proof;
        uint yesVotes;
        uint noVotes;
        bool released;
    }

    Milestone[] public milestones;
    bool public campaignCreated;
    uint public currentMilestoneIndex; // Enforces "One Milestone at a Time"
    
    // milestoneIndex => voter => bool
    mapping(uint => mapping(address => bool)) public hasVoted;

    modifier onlyManager() {
        require(msg.sender == manager, "Only manager can call this");
        _;
    }

    modifier onlyContributor() {
        require(contributors[msg.sender] > 0, "Only contributors can vote");
        _;
    }

    constructor() {
        manager = msg.sender;
    }

    /**
     * @dev Contribute ETH to the campaign
     */
    function contribute() public payable {
        require(msg.value > 0, "Contribution must be greater than 0");
        if (contributors[msg.sender] == 0) {
            totalContributors++;
        }
        contributors[msg.sender] += msg.value;
        totalFunds += msg.value;
    }

    /**
     * @dev Create campaign with multiple milestones (max 5)
     */
    function createCampaign(
        string[] memory _titles,
        string[] memory _descriptions,
        uint[] memory _amounts,
        address payable[] memory _beneficiaries
    ) public onlyManager {
        require(!campaignCreated, "Campaign already created");
        require(_titles.length > 0 && _titles.length <= 5, "Milestones count must be between 1 and 5");
        require(
            _titles.length == _descriptions.length &&
            _titles.length == _amounts.length &&
            _titles.length == _beneficiaries.length,
            "Array lengths must match"
        );

        for (uint i = 0; i < _titles.length; i++) {
            require(_beneficiaries[i] != address(0), "Invalid beneficiary address");
            require(_beneficiaries[i] != manager, "Creator cannot be beneficiary directly"); // Beneficiary Lock
            require(_amounts[i] > 0, "Milestone amount must be > 0");
            
            milestones.push(Milestone({
                title: _titles[i],
                description: _descriptions[i],
                amount: _amounts[i],
                beneficiary: _beneficiaries[i],
                status: MilestoneStatus.Pending,
                proof: "",
                yesVotes: 0,
                noVotes: 0,
                released: false
            }));
        }
        campaignCreated = true;
    }

    /**
     * @dev Manager submits proof for the current pending milestone
     */
    function submitProof(uint _milestoneId, string memory _proof) public onlyManager {
        require(campaignCreated, "Campaign not created");
        require(_milestoneId < milestones.length, "Invalid milestone ID");
        require(_milestoneId == currentMilestoneIndex, "Must complete milestones in order"); // One Milestone at a Time
        
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.Pending || milestone.status == MilestoneStatus.Rejected, "Invalid milestone state for proof submission");
        
        milestone.proof = _proof;
        milestone.status = MilestoneStatus.UnderReview;
        
        // Reset votes if resubmitted
        milestone.yesVotes = 0;
        milestone.noVotes = 0;
    }

    /**
     * @dev Contributors vote on the current milestone under review
     */
    function voteOnMilestone(uint _milestoneId, bool _support) public onlyContributor {
        require(_milestoneId < milestones.length, "Invalid milestone ID");
        require(_milestoneId == currentMilestoneIndex, "Can only vote on current milestone"); // Prevent early voting on future milestones
        
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.UnderReview, "Milestone is not under review");
        require(!hasVoted[_milestoneId][msg.sender], "You have already voted on this milestone"); // Prevent double voting
        
        hasVoted[_milestoneId][msg.sender] = true;
        
        // Voting power proportional to contribution
        uint votePower = contributors[msg.sender];
        if (_support) {
            milestone.yesVotes += votePower;
        } else {
            milestone.noVotes += votePower;
        }
    }

    /**
     * @dev Finalize voting and transfer funds for the current milestone
     */
    function releaseFunds(uint _milestoneId) public onlyManager {
        require(_milestoneId < milestones.length, "Invalid milestone ID");
        require(_milestoneId == currentMilestoneIndex, "Can only release current milestone"); // Prevent early release logic part 1
        
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.UnderReview, "Milestone must be under review"); // Prevent early release logic part 2
        require(!milestone.released, "Funds already released");
        
        if (milestone.yesVotes > milestone.noVotes) {
            milestone.status = MilestoneStatus.Released;
            milestone.released = true;
            
            // Move to next milestone
            currentMilestoneIndex++;
            
            // Re-entrancy guard via state modification before transfer
            require(address(this).balance >= milestone.amount, "Insufficient contract balance");
            milestone.beneficiary.transfer(milestone.amount);
            
        } else {
            milestone.status = MilestoneStatus.Rejected;
            // Creator must submitProof again
        }
    }
    
    function getMilestonesCount() public view returns (uint) {
        return milestones.length;
    }
    
    function getMilestone(uint _id) public view returns (
        string memory title,
        string memory description,
        uint amount,
        address beneficiary,
        MilestoneStatus status,
        string memory proof,
        uint yesVotes,
        uint noVotes,
        bool released
    ) {
        require(_id < milestones.length, "Invalid milestone ID");
        Milestone storage m = milestones[_id];
        return (
            m.title,
            m.description,
            m.amount,
            m.beneficiary,
            m.status,
            m.proof,
            m.yesVotes,
            m.noVotes,
            m.released
        );
    }
    
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}
