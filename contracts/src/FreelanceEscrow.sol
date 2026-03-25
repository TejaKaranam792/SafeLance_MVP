// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title FreelanceEscrow
 * @notice Gasless freelance escrow platform with meta-transaction support.
 *         Clients create and fund jobs; freelancers receive payments.
 *         All transactions can be submitted by a relayer (gasless UX).
 */
contract FreelanceEscrow is ReentrancyGuard {
    using ECDSA for bytes32;

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    enum JobStatus {
        Pending,    // 0 — created, not yet funded
        Funded,     // 1 — ETH deposited in escrow
        Completed,  // 2 — funds released to freelancer
        Refunded    // 3 — funds returned to client
    }

    struct Job {
        address client;
        address freelancer;
        uint256 amount;      // ETH locked in escrow (wei)
        JobStatus status;
        string  description;
        uint256 createdAt;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    uint256 public jobCount;

    /// @dev jobId => Job
    mapping(uint256 => Job) public jobs;

    /// @dev address => nonce (for meta-tx replay prevention)
    mapping(address => uint256) public nonces;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed freelancer,
        string  description
    );

    event JobFunded(
        uint256 indexed jobId,
        uint256 amount
    );

    event PaymentReleased(
        uint256 indexed jobId,
        address indexed freelancer,
        uint256 amount
    );

    event Refunded(
        uint256 indexed jobId,
        address indexed client,
        uint256 amount
    );

    event MetaTxExecuted(
        address indexed from,
        uint256 nonce,
        bool    success
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Meta-tx context
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Used to pass the original signer through executeMetaTx → internal fns.
    address private _metaTxSender;

    /**
     * @notice Returns the effective msg.sender:
     *         - the original signer when called via executeMetaTx
     *         - msg.sender for direct calls
     */
    function _msgSender() internal view returns (address) {
        if (msg.sender == address(this) && _metaTxSender != address(0)) {
            return _metaTxSender;
        }
        return msg.sender;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Meta-transaction entry point
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute any function on behalf of `from` without `from` paying gas.
     * @param from         The original signer (the user).
     * @param functionData ABI-encoded function call (selector + arguments).
     * @param signature    ECDSA signature over the meta-tx hash.
     *
     * Signature message: keccak256(from, nonce, functionData, address(this), chainId)
     * This prevents:
     *   - Replay attacks (nonce is incremented after use)
     *   - Cross-contract replays (address(this))
     *   - Cross-chain replays (block.chainid)
     */
    function executeMetaTx(
        address from,
        bytes calldata functionData,
        bytes calldata signature
    ) external nonReentrant returns (bytes memory) {
        require(from != address(0), "FreelanceEscrow: zero address");

        // Build the hash the user should have signed
        bytes32 metaTxHash = keccak256(
            abi.encodePacked(
                from,
                nonces[from],
                functionData,
                address(this),
                block.chainid
            )
        );

        // Recover signer from EIP-191 personal_sign hash
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(metaTxHash);
        address recovered = ECDSA.recover(ethSignedHash, signature);
        require(recovered == from, "FreelanceEscrow: invalid signature");

        // Increment nonce BEFORE execution (checks-effects-interactions)
        uint256 usedNonce = nonces[from];
        nonces[from]++;

        // Inject the signer as _metaTxSender so _msgSender() resolves correctly
        _metaTxSender = from;

        // Execute the encoded function (self-call)
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returnData) = address(this).call(functionData);

        // Reset context
        _metaTxSender = address(0);

        emit MetaTxExecuted(from, usedNonce, success);

        // Bubble up revert reason if the inner call failed
        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    revert(add(32, returnData), mload(returnData))
                }
            }
            revert("FreelanceEscrow: inner call failed");
        }

        return returnData;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Create a new job. The caller becomes the client.
     * @param freelancer  Address of the freelancer.
     * @param description Brief description of the work.
     * @return jobId The newly created job ID.
     */
    function createJob(
        address freelancer,
        string calldata description
    ) external returns (uint256 jobId) {
        address client = _msgSender();

        require(freelancer != address(0), "FreelanceEscrow: zero freelancer");
        require(freelancer != client,     "FreelanceEscrow: client == freelancer");
        require(bytes(description).length > 0, "FreelanceEscrow: empty description");

        jobId = jobCount++;

        jobs[jobId] = Job({
            client:      client,
            freelancer:  freelancer,
            amount:      0,
            status:      JobStatus.Pending,
            description: description,
            createdAt:   block.timestamp
        });

        emit JobCreated(jobId, client, freelancer, description);
    }

    /**
     * @notice Fund an existing job by depositing ETH.
     *         Only the job's client may fund it, and only once (Pending → Funded).
     * @param jobId The job to fund.
     */
    function fundJob(uint256 jobId) external payable nonReentrant {
        address sender = _msgSender();
        Job storage job = jobs[jobId];

        require(job.client != address(0), "FreelanceEscrow: job does not exist");
        require(sender == job.client,     "FreelanceEscrow: not the client");
        require(job.status == JobStatus.Pending, "FreelanceEscrow: job not pending");
        require(msg.value > 0,            "FreelanceEscrow: must send ETH");

        job.amount = msg.value;
        job.status = JobStatus.Funded;

        emit JobFunded(jobId, msg.value);
    }

    /**
     * @notice Release escrowed funds to the freelancer.
     *         Only the client may call this, and only when the job is Funded.
     * @param jobId The job to complete.
     */
    function releasePayment(uint256 jobId) external nonReentrant {
        address sender = _msgSender();
        Job storage job = jobs[jobId];

        require(job.client != address(0), "FreelanceEscrow: job does not exist");
        require(sender == job.client,     "FreelanceEscrow: not the client");
        require(job.status == JobStatus.Funded, "FreelanceEscrow: job not funded");

        uint256 amount = job.amount;
        address freelancer = job.freelancer;

        // Effects before interactions (CEI pattern)
        job.status = JobStatus.Completed;
        job.amount = 0;

        (bool sent, ) = payable(freelancer).call{value: amount}("");
        require(sent, "FreelanceEscrow: ETH transfer failed");

        emit PaymentReleased(jobId, freelancer, amount);
    }

    /**
     * @notice Refund escrowed ETH back to the client.
     *         Only the freelancer may initiate a refund, and only when Funded.
     * @param jobId The job to refund.
     */
    function refund(uint256 jobId) external nonReentrant {
        address sender = _msgSender();
        Job storage job = jobs[jobId];

        require(job.client != address(0),    "FreelanceEscrow: job does not exist");
        require(sender == job.freelancer,    "FreelanceEscrow: not the freelancer");
        require(job.status == JobStatus.Funded, "FreelanceEscrow: job not funded");

        uint256 amount = job.amount;
        address client = job.client;

        // Effects before interactions
        job.status = JobStatus.Refunded;
        job.amount = 0;

        (bool sent, ) = payable(client).call{value: amount}("");
        require(sent, "FreelanceEscrow: ETH transfer failed");

        emit Refunded(jobId, client, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Returns all fields for a given job.
     */
    function getJob(uint256 jobId)
        external
        view
        returns (
            address client,
            address freelancer,
            uint256 amount,
            JobStatus status,
            string memory description,
            uint256 createdAt
        )
    {
        Job storage job = jobs[jobId];
        require(job.client != address(0), "FreelanceEscrow: job does not exist");
        return (
            job.client,
            job.freelancer,
            job.amount,
            job.status,
            job.description,
            job.createdAt
        );
    }

    /**
     * @notice Returns the current nonce for an address (for building meta-tx hashes off-chain).
     */
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    // Fallback: reject accidental ETH sends
    receive() external payable {
        revert("FreelanceEscrow: use fundJob");
    }
}
