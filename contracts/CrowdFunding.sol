// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title CrowdFunding
 * @dev Decentralized crowd-funding contract with transparent escrow and voting system
 */
contract CrowdFunding {
    
    // Manager address (contract deployer)
    address public manager;
    
    // Mapping to track contributions
    mapping(address => uint) public contributors;
    
    // Total number of contributors
    uint public totalContributors;
    
    // Total funds raised
    uint public totalFunds;
    
    // Spending request structure
    struct SpendingRequest {
        string description;
        uint amount;
        address payable recipient;
        bool completed;
        uint approvalCount;
        uint rejectCount;
        mapping(address => bool) hasVoted;
    }
    
    // Array of spending requests
    mapping(uint => SpendingRequest) public requests;
    uint public requestCount;
    
    // Modifiers
    modifier onlyManager() {
        require(msg.sender == manager, "Only manager can call this");
        _;
    }
    
    modifier onlyContributor() {
        require(contributors[msg.sender] > 0, "Only contributors can vote");
        _;
    }
    
    // Constructor - sets deployer as manager
    constructor() {
        manager = msg.sender;
    }
    
    /**
     * @dev Contribute ETH to the campaign
     */
    function contribute() public payable {
        require(msg.value > 0, "Contribution must be greater than 0");
        
        // If first time contributor, increment count
        if (contributors[msg.sender] == 0) {
            totalContributors++;
        }
        
        // Track contribution
        contributors[msg.sender] += msg.value;
        totalFunds += msg.value;
    }
    
    /**
     * @dev Create a spending request (manager only)
     * @param _description Description of the spending request
     * @param _amount Amount requested in wei
     * @param _recipient Address to receive funds if approved
     */
    function createRequest(
        string memory _description,
        uint _amount,
        address payable _recipient
    ) public onlyManager {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= address(this).balance, "Insufficient funds");
        require(_recipient != address(0), "Invalid recipient address");
        
        SpendingRequest storage newRequest = requests[requestCount];
        newRequest.description = _description;
        newRequest.amount = _amount;
        newRequest.recipient = _recipient;
        newRequest.completed = false;
        newRequest.approvalCount = 0;
        newRequest.rejectCount = 0;
        
        requestCount++;
    }
    
    /**
     * @dev Vote to approve a spending request
     * @param _requestId ID of the request to approve
     */
    function approveRequest(uint _requestId) public onlyContributor {
        require(_requestId < requestCount, "Invalid request ID");
        
        SpendingRequest storage request = requests[_requestId];
        require(!request.completed, "Request already completed");
        require(!request.hasVoted[msg.sender], "You have already voted");
        
        request.hasVoted[msg.sender] = true;
        request.approvalCount++;
    }
    
    /**
     * @dev Vote to reject a spending request
     * @param _requestId ID of the request to reject
     */
    function rejectRequest(uint _requestId) public onlyContributor {
        require(_requestId < requestCount, "Invalid request ID");
        
        SpendingRequest storage request = requests[_requestId];
        require(!request.completed, "Request already completed");
        require(!request.hasVoted[msg.sender], "You have already voted");
        
        request.hasVoted[msg.sender] = true;
        request.rejectCount++;
    }
    
    /**
     * @dev Finalize a request and release funds if approved by majority
     * @param _requestId ID of the request to finalize
     */
    function finalizeRequest(uint _requestId) public onlyManager {
        require(_requestId < requestCount, "Invalid request ID");
        
        SpendingRequest storage request = requests[_requestId];
        require(!request.completed, "Request already completed");
        require(request.approvalCount > (totalContributors / 2), "Majority approval required");
        
        // Mark as completed first (re-entrancy protection)
        request.completed = true;
        
        // Transfer funds to recipient
        request.recipient.transfer(request.amount);
    }
    
    /**
     * @dev Get request details
     * @param _requestId ID of the request
     */
    function getRequest(uint _requestId) public view returns (
        string memory description,
        uint amount,
        address recipient,
        bool completed,
        uint approvalCount,
        uint rejectCount
    ) {
        require(_requestId < requestCount, "Invalid request ID");
        
        SpendingRequest storage request = requests[_requestId];
        return (
            request.description,
            request.amount,
            request.recipient,
            request.completed,
            request.approvalCount,
            request.rejectCount
        );
    }
    
    /**
     * @dev Check if an address has voted on a request
     * @param _requestId ID of the request
     * @param _voter Address of the voter
     */
    function hasVoted(uint _requestId, address _voter) public view returns (bool) {
        require(_requestId < requestCount, "Invalid request ID");
        return requests[_requestId].hasVoted[_voter];
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}
