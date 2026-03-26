// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ReputationRegistry
 * @notice Trustless, on-chain reputation for SafeLance freelancers.
 *         Only the trusted MilestoneEscrow contract can write ratings,
 *         preventing fake/inflated scores.
 *
 * Score formula (0–100):
 *   score = clamp((avgStars × 20) + min(milestonesCompleted × 5, 50), 0, 100)
 *
 *   avgStars       → 0–5  → contributes up to 100 (5 × 20)
 *   milestones     → each adds 5 pts, capped at 50 so quality still matters
 *   total clamped  → 0–100
 */
contract ReputationRegistry {
    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct Reputation {
        uint256 milestonesCompleted;
        uint256 totalEthEarned;    // cumulative wei
        uint256 ratingSum;         // sum of all star ratings (1–5 each)
        uint256 ratingCount;       // number of ratings received
        bool    verified;          // true when milestonesCompleted >= 3
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    address public immutable trustedEscrow;
    address public immutable owner;

    mapping(address => Reputation) private _reputations;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event RatingRecorded(
        address indexed freelancer,
        address indexed client,
        uint8   stars,
        uint256 ethAmount,
        uint256 newScore,
        bool    verified
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address escrowAddress) {
        require(escrowAddress != address(0), "RR: zero escrow");
        trustedEscrow = escrowAddress;
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyEscrow() {
        require(msg.sender == trustedEscrow, "RR: caller not trusted escrow");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Write: Called by MilestoneEscrow after approveMilestone
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Record a completed milestone rating for a freelancer.
     * @param freelancer  The freelancer address to credit.
     * @param client      The client who approved the work.
     * @param ethAmount   Wei amount paid out (for totalEthEarned tracking).
     * @param stars       Star rating given by client, must be 1–5.
     */
    function recordRating(
        address freelancer,
        address client,
        uint256 ethAmount,
        uint8   stars
    ) external onlyEscrow {
        require(freelancer != address(0), "RR: zero freelancer");
        require(stars >= 1 && stars <= 5,  "RR: stars must be 1-5");

        Reputation storage rep = _reputations[freelancer];
        rep.milestonesCompleted += 1;
        rep.totalEthEarned      += ethAmount;
        rep.ratingSum           += stars;
        rep.ratingCount         += 1;

        // Auto-grant verified badge at 3+ completed milestones
        if (rep.milestonesCompleted >= 3) {
            rep.verified = true;
        }

        uint256 score = _computeScore(rep);

        emit RatingRecorded(freelancer, client, stars, ethAmount, score, rep.verified);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Read
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Returns raw reputation stats for a freelancer.
     */
    function getReputation(address freelancer)
        external
        view
        returns (
            uint256 milestonesCompleted,
            uint256 totalEthEarned,
            uint256 ratingSum,
            uint256 ratingCount,
            bool    verified
        )
    {
        Reputation storage rep = _reputations[freelancer];
        return (
            rep.milestonesCompleted,
            rep.totalEthEarned,
            rep.ratingSum,
            rep.ratingCount,
            rep.verified
        );
    }

    /**
     * @notice Returns the computed 0–100 reputation score for a freelancer.
     */
    function getScore(address freelancer) external view returns (uint256) {
        return _computeScore(_reputations[freelancer]);
    }

    /**
     * @notice Returns average star rating scaled ×10 (e.g. 4.5 stars → 45).
     *         Returns 0 if no ratings yet.
     */
    function getAverageStarsX10(address freelancer) external view returns (uint256) {
        Reputation storage rep = _reputations[freelancer];
        if (rep.ratingCount == 0) return 0;
        // Multiply by 10 before dividing to preserve one decimal place
        return (rep.ratingSum * 10) / rep.ratingCount;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _computeScore(Reputation storage rep) internal view returns (uint256) {
        // avgStars contribution: (ratingSum / ratingCount) * 20, up to 100
        uint256 starComponent = 0;
        if (rep.ratingCount > 0) {
            // Multiply first to avoid integer truncation: (sum * 20) / count
            starComponent = (rep.ratingSum * 20) / rep.ratingCount;
        }

        // Milestone contribution: 5 pts each, capped at 50
        uint256 msComponent = rep.milestonesCompleted * 5;
        if (msComponent > 50) msComponent = 50;

        uint256 total = starComponent + msComponent;
        if (total > 100) total = 100;
        return total;
    }
}
