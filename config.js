// Configuration file for the CrowdFunding DApp

const CONFIG = {
    contractAddress: "0xb08f3C0B93a690c600C382233bB817E5B68cce00",

    // Sepolia testnet configuration
    sepoliaChainId: "0xaa36a7",
    sepoliaNetworkName: "Sepolia Testnet",

    contractABI: [
        {
            "inputs": [],
            "name": "contribute",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string[]",
                    "name": "_titles",
                    "type": "string[]"
                },
                {
                    "internalType": "string[]",
                    "name": "_descriptions",
                    "type": "string[]"
                },
                {
                    "internalType": "uint256[]",
                    "name": "_amounts",
                    "type": "uint256[]"
                },
                {
                    "internalType": "address payable[]",
                    "name": "_beneficiaries",
                    "type": "address[]"
                }
            ],
            "name": "createCampaign",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_milestoneId",
                    "type": "uint256"
                }
            ],
            "name": "releaseFunds",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_milestoneId",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "_proof",
                    "type": "string"
                }
            ],
            "name": "submitProof",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_milestoneId",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "_support",
                    "type": "bool"
                }
            ],
            "name": "voteOnMilestone",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "campaignCreated",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "contributors",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "currentMilestoneIndex",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getBalance",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_id",
                    "type": "uint256"
                }
            ],
            "name": "getMilestone",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "title",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "description",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "beneficiary",
                    "type": "address"
                },
                {
                    "internalType": "enum CrowdFunding.MilestoneStatus",
                    "name": "status",
                    "type": "uint8"
                },
                {
                    "internalType": "string",
                    "name": "proof",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "yesVotes",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "noVotes",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "released",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getMilestonesCount",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "hasVoted",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "manager",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "milestones",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "title",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "description",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                },
                {
                    "internalType": "address payable",
                    "name": "beneficiary",
                    "type": "address"
                },
                {
                    "internalType": "enum CrowdFunding.MilestoneStatus",
                    "name": "status",
                    "type": "uint8"
                },
                {
                    "internalType": "string",
                    "name": "proof",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "yesVotes",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "noVotes",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "released",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "totalContributors",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "totalFunds",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
};