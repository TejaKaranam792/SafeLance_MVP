// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MilestoneEscrow
 * @notice Gasless freelance escrow with milestone-based payments.
 *         Clients create jobs with N milestones; each milestone is funded and
 *         released independently. All actions support meta-transactions so
 *         users never pay gas.
 */
contract MilestoneEscrow is ReentrancyGuard {
    using ECDSA for bytes32;

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    enum MilestoneStatus {
        Pending,    // 0 — created, not yet funded
        Funded,     // 1 — ETH deposited in escrow
        Submitted,  // 2 — freelancer submitted work
        Approved,   // 3 — client released payment → freelancer
        Disputed,   // 4 — client raised a dispute
        Refunded    // 5 — ETH returned to client
    }

    struct Milestone {
        string          title;
        uint256         amount;       // ETH locked (wei)
        MilestoneStatus status;
        uint256         fundedAt;
        uint256         releasedAt;
    }

    struct Job {
        address client;
        address freelancer;
        string  title;
        string  description;
        uint256 totalFunded;          // sum of all funded milestones
        uint256 createdAt;
        uint8   milestoneCount;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    uint256 public jobCount;

    mapping(uint256 => Job)                            public jobs;
    mapping(uint256 => mapping(uint8 => Milestone))    public milestones;
    mapping(address => uint256)                        public nonces;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed freelancer,
        string  title,
        uint8   milestoneCount
    );

    event MilestoneAdded(
        uint256 indexed jobId,
        uint8   indexed milestoneIndex,
        string  title,
        uint256 amount
    );

    event MilestoneFunded(
        uint256 indexed jobId,
        uint8   indexed milestoneIndex,
        uint256 amount
    );

    event MilestoneSubmitted(
        uint256 indexed jobId,
        uint8   indexed milestoneIndex
    );

    event MilestoneApproved(
        uint256 indexed jobId,
        uint8   indexed milestoneIndex,
        address indexed freelancer,
        uint256 amount
    );

    event MilestoneDisputed(
        uint256 indexed jobId,
        uint8   indexed milestoneIndex
    );

    event MilestoneRefunded(
        uint256 indexed jobId,
        uint8   indexed milestoneIndex,
        address indexed client,
        uint256 amount
    );

    event MetaTxExecuted(address indexed from, uint256 nonce, bool success);

    // ─────────────────────────────────────────────────────────────────────────
    // Meta-transaction support
    // ─────────────────────────────────────────────────────────────────────────

    address private _metaTxSender;

    function _msgSender() internal view returns (address) {
        if (msg.sender == address(this) && _metaTxSender != address(0)) {
            return _metaTxSender;
        }
        return msg.sender;
    }

    /**
     * @notice Execute any function gaslessly on behalf of `from`.
     *         Signature: keccak256(from, nonce, functionData, address(this), chainId)
     */
    function executeMetaTx(
        address from,
        bytes calldata functionData,
        bytes calldata signature
    ) external nonReentrant returns (bytes memory) {
        require(from != address(0), "ME: zero address");

        bytes32 metaTxHash = keccak256(
            abi.encodePacked(from, nonces[from], functionData, address(this), block.chainid)
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(metaTxHash);
        address recovered = ECDSA.recover(ethSignedHash, signature);
        require(recovered == from, "ME: invalid signature");

        uint256 usedNonce = nonces[from];
        nonces[from]++;

        _metaTxSender = from;
        (bool success, bytes memory returnData) = address(this).call(functionData);
        _metaTxSender = address(0);

        emit MetaTxExecuted(from, usedNonce, success);

        if (!success) {
            if (returnData.length > 0) {
                assembly { revert(add(32, returnData), mload(returnData)) }
            }
            revert("ME: inner call failed");
        }
        return returnData;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core: Job Creation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Create a job with multiple milestones in a single transaction.
     * @param freelancer        Address of the freelancer.
     * @param title             Job title.
     * @param description       Full job description.
     * @param milestoneTitles   Array of milestone title strings.
     * @param milestoneAmounts  Array of ETH amounts (wei) per milestone.
     * @return jobId            The newly created job ID.
     */
    function createJobWithMilestones(
        address freelancer,
        string  calldata title,
        string  calldata description,
        string[] calldata milestoneTitles,
        uint256[] calldata milestoneAmounts
    ) external returns (uint256 jobId) {
        address client = _msgSender();

        require(freelancer != address(0),  "ME: zero freelancer");
        require(freelancer != client,      "ME: client == freelancer");
        require(bytes(title).length > 0,   "ME: empty title");
        require(milestoneTitles.length > 0,           "ME: no milestones");
        require(milestoneTitles.length == milestoneAmounts.length, "ME: length mismatch");
        require(milestoneTitles.length <= 20,          "ME: too many milestones");

        jobId = jobCount++;

        jobs[jobId] = Job({
            client:         client,
            freelancer:     freelancer,
            title:          title,
            description:    description,
            totalFunded:    0,
            createdAt:      block.timestamp,
            milestoneCount: uint8(milestoneTitles.length)
        });

        for (uint8 i = 0; i < uint8(milestoneTitles.length); i++) {
            require(milestoneAmounts[i] > 0, "ME: milestone amount must be > 0");
            milestones[jobId][i] = Milestone({
                title:      milestoneTitles[i],
                amount:     milestoneAmounts[i],
                status:     MilestoneStatus.Pending,
                fundedAt:   0,
                releasedAt: 0
            });
            emit MilestoneAdded(jobId, i, milestoneTitles[i], milestoneAmounts[i]);
        }

        emit JobCreated(jobId, client, freelancer, title, uint8(milestoneTitles.length));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core: Payments
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Client funds a specific milestone by sending the exact ETH amount.
     * @param jobId            The job ID.
     * @param milestoneIndex   Which milestone (0-based).
     */
    function fundMilestone(uint256 jobId, uint8 milestoneIndex)
        external payable nonReentrant
    {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        Milestone storage ms = milestones[jobId][milestoneIndex];

        require(job.client != address(0),          "ME: job not found");
        require(sender == job.client,              "ME: not the client");
        require(milestoneIndex < job.milestoneCount, "ME: bad index");
        require(ms.status == MilestoneStatus.Pending, "ME: not pending");
        require(msg.value == ms.amount,            "ME: wrong ETH amount");

        ms.status   = MilestoneStatus.Funded;
        ms.fundedAt = block.timestamp;
        job.totalFunded += msg.value;

        emit MilestoneFunded(jobId, milestoneIndex, msg.value);
    }

    /**
     * @notice Freelancer marks a milestone as submitted (work done).
     * @param jobId            The job ID.
     * @param milestoneIndex   Which milestone (0-based).
     */
    function submitMilestone(uint256 jobId, uint8 milestoneIndex)
        external nonReentrant
    {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        Milestone storage ms = milestones[jobId][milestoneIndex];

        require(job.client != address(0),            "ME: job not found");
        require(sender == job.freelancer,             "ME: not the freelancer");
        require(milestoneIndex < job.milestoneCount,  "ME: bad index");
        require(ms.status == MilestoneStatus.Funded,  "ME: not funded");

        ms.status = MilestoneStatus.Submitted;

        emit MilestoneSubmitted(jobId, milestoneIndex);
    }

    /**
     * @notice Client approves a milestone — releases ETH to the freelancer.
     * @param jobId            The job ID.
     * @param milestoneIndex   Which milestone (0-based).
     */
    function approveMilestone(uint256 jobId, uint8 milestoneIndex)
        external nonReentrant
    {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        Milestone storage ms = milestones[jobId][milestoneIndex];

        require(job.client != address(0),              "ME: job not found");
        require(sender == job.client,                  "ME: not the client");
        require(milestoneIndex < job.milestoneCount,   "ME: bad index");
        // Allow approve from Funded or Submitted
        require(
            ms.status == MilestoneStatus.Funded ||
            ms.status == MilestoneStatus.Submitted,
            "ME: cannot approve"
        );

        uint256 amount     = ms.amount;
        address freelancer = job.freelancer;

        // CEI pattern
        ms.status      = MilestoneStatus.Approved;
        ms.releasedAt  = block.timestamp;
        ms.amount      = 0;
        job.totalFunded -= amount;

        (bool sent, ) = payable(freelancer).call{value: amount}("");
        require(sent, "ME: ETH transfer failed");

        emit MilestoneApproved(jobId, milestoneIndex, freelancer, amount);
    }

    /**
     * @notice Client raises a dispute on a funded/submitted milestone.
     *         Halts the milestone; manual refund can follow.
     * @param jobId            The job ID.
     * @param milestoneIndex   Which milestone (0-based).
     */
    function disputeMilestone(uint256 jobId, uint8 milestoneIndex)
        external nonReentrant
    {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        Milestone storage ms = milestones[jobId][milestoneIndex];

        require(job.client != address(0),             "ME: job not found");
        require(sender == job.client,                 "ME: not the client");
        require(milestoneIndex < job.milestoneCount,  "ME: bad index");
        require(
            ms.status == MilestoneStatus.Funded ||
            ms.status == MilestoneStatus.Submitted,
            "ME: cannot dispute"
        );

        ms.status = MilestoneStatus.Disputed;

        emit MilestoneDisputed(jobId, milestoneIndex);
    }

    /**
     * @notice Client refunds a disputed or pending milestone back to themselves.
     * @param jobId            The job ID.
     * @param milestoneIndex   Which milestone (0-based).
     */
    function refundMilestone(uint256 jobId, uint8 milestoneIndex)
        external nonReentrant
    {
        address sender = _msgSender();
        Job storage job = jobs[jobId];
        Milestone storage ms = milestones[jobId][milestoneIndex];

        require(job.client != address(0),            "ME: job not found");
        require(sender == job.client,                "ME: not the client");
        require(milestoneIndex < job.milestoneCount, "ME: bad index");
        require(
            ms.status == MilestoneStatus.Disputed ||
            ms.status == MilestoneStatus.Funded,
            "ME: cannot refund"
        );
        require(ms.amount > 0, "ME: nothing to refund");

        uint256 amount = ms.amount;

        // CEI pattern
        ms.status      = MilestoneStatus.Refunded;
        ms.amount      = 0;
        job.totalFunded -= amount;

        (bool sent, ) = payable(sender).call{value: amount}("");
        require(sent, "ME: ETH transfer failed");

        emit MilestoneRefunded(jobId, milestoneIndex, sender, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────────────────

    function getJob(uint256 jobId)
        external view
        returns (
            address client,
            address freelancer,
            string memory title,
            string memory description,
            uint256 totalFunded,
            uint256 createdAt,
            uint8   milestoneCount
        )
    {
        Job storage job = jobs[jobId];
        require(job.client != address(0), "ME: job not found");
        return (
            job.client,
            job.freelancer,
            job.title,
            job.description,
            job.totalFunded,
            job.createdAt,
            job.milestoneCount
        );
    }

    function getMilestone(uint256 jobId, uint8 milestoneIndex)
        external view
        returns (
            string memory title,
            uint256 amount,
            MilestoneStatus status,
            uint256 fundedAt,
            uint256 releasedAt
        )
    {
        Job storage job = jobs[jobId];
        require(job.client != address(0), "ME: job not found");
        require(milestoneIndex < job.milestoneCount, "ME: bad index");
        Milestone storage ms = milestones[jobId][milestoneIndex];
        return (ms.title, ms.amount, ms.status, ms.fundedAt, ms.releasedAt);
    }

    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    // Reject accidental ETH sends
    receive() external payable {
        revert("ME: use fundMilestone");
    }
}
