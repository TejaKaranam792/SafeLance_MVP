import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FreelanceEscrow } from "../typechain-types";

describe("FreelanceEscrow", function () {
  let escrow: FreelanceEscrow;
  let client: SignerWithAddress;
  let freelancer: SignerWithAddress;
  let relayer: SignerWithAddress;
  let stranger: SignerWithAddress;

  const JOB_DESCRIPTION = "Build a DeFi dashboard";
  const FUND_AMOUNT = ethers.parseEther("0.1");

  beforeEach(async () => {
    [client, freelancer, relayer, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("FreelanceEscrow");
    escrow = (await Factory.deploy()) as FreelanceEscrow;
    await escrow.waitForDeployment();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  async function buildMetaTxSignature(
    signer: SignerWithAddress,
    functionData: string
  ): Promise<string> {
    const nonce = await escrow.getNonce(signer.address);
    const contractAddress = await escrow.getAddress();
    const chainId = (await ethers.provider.getNetwork()).chainId;

    const metaTxHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "bytes", "address", "uint256"],
      [signer.address, nonce, functionData, contractAddress, chainId]
    );

    // EIP-191 personal_sign
    return signer.signMessage(ethers.getBytes(metaTxHash));
  }

  async function executeViaMetaTx(
    signer: SignerWithAddress,
    functionData: string,
    overrides: { value?: bigint } = {}
  ) {
    const signature = await buildMetaTxSignature(signer, functionData);
    return escrow
      .connect(relayer)
      .executeMetaTx(signer.address, functionData, signature, overrides);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // createJob
  // ──────────────────────────────────────────────────────────────────────────

  describe("createJob", () => {
    it("should create a job and emit JobCreated", async () => {
      await expect(
        escrow.connect(client).createJob(freelancer.address, JOB_DESCRIPTION)
      )
        .to.emit(escrow, "JobCreated")
        .withArgs(0, client.address, freelancer.address, JOB_DESCRIPTION);

      const [c, f, amount, status, desc] = await escrow.getJob(0);
      expect(c).to.equal(client.address);
      expect(f).to.equal(freelancer.address);
      expect(amount).to.equal(0n);
      expect(status).to.equal(0); // Pending
      expect(desc).to.equal(JOB_DESCRIPTION);
    });

    it("should increment jobCount", async () => {
      await escrow.connect(client).createJob(freelancer.address, "Job 1");
      await escrow.connect(client).createJob(freelancer.address, "Job 2");
      expect(await escrow.jobCount()).to.equal(2);
    });

    it("should revert if freelancer is zero address", async () => {
      await expect(
        escrow.connect(client).createJob(ethers.ZeroAddress, JOB_DESCRIPTION)
      ).to.be.revertedWith("FreelanceEscrow: zero freelancer");
    });

    it("should revert if client == freelancer", async () => {
      await expect(
        escrow.connect(client).createJob(client.address, JOB_DESCRIPTION)
      ).to.be.revertedWith("FreelanceEscrow: client == freelancer");
    });

    it("should revert if description is empty", async () => {
      await expect(
        escrow.connect(client).createJob(freelancer.address, "")
      ).to.be.revertedWith("FreelanceEscrow: empty description");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // fundJob
  // ──────────────────────────────────────────────────────────────────────────

  describe("fundJob", () => {
    beforeEach(async () => {
      await escrow.connect(client).createJob(freelancer.address, JOB_DESCRIPTION);
    });

    it("should fund a job and emit JobFunded", async () => {
      await expect(
        escrow.connect(client).fundJob(0, { value: FUND_AMOUNT })
      )
        .to.emit(escrow, "JobFunded")
        .withArgs(0, FUND_AMOUNT);

      const [, , amount, status] = await escrow.getJob(0);
      expect(amount).to.equal(FUND_AMOUNT);
      expect(status).to.equal(1); // Funded
    });

    it("should lock ETH in the contract", async () => {
      await escrow.connect(client).fundJob(0, { value: FUND_AMOUNT });
      const contractBalance = await ethers.provider.getBalance(
        await escrow.getAddress()
      );
      expect(contractBalance).to.equal(FUND_AMOUNT);
    });

    it("should revert if caller is not the client", async () => {
      await expect(
        escrow.connect(stranger).fundJob(0, { value: FUND_AMOUNT })
      ).to.be.revertedWith("FreelanceEscrow: not the client");
    });

    it("should revert if sending 0 ETH", async () => {
      await expect(
        escrow.connect(client).fundJob(0, { value: 0 })
      ).to.be.revertedWith("FreelanceEscrow: must send ETH");
    });

    it("should revert if job is already funded (double funding)", async () => {
      await escrow.connect(client).fundJob(0, { value: FUND_AMOUNT });
      await expect(
        escrow.connect(client).fundJob(0, { value: FUND_AMOUNT })
      ).to.be.revertedWith("FreelanceEscrow: job not pending");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // releasePayment
  // ──────────────────────────────────────────────────────────────────────────

  describe("releasePayment", () => {
    beforeEach(async () => {
      await escrow.connect(client).createJob(freelancer.address, JOB_DESCRIPTION);
      await escrow.connect(client).fundJob(0, { value: FUND_AMOUNT });
    });

    it("should release payment to freelancer and emit PaymentReleased", async () => {
      const before = await ethers.provider.getBalance(freelancer.address);
      await expect(escrow.connect(client).releasePayment(0))
        .to.emit(escrow, "PaymentReleased")
        .withArgs(0, freelancer.address, FUND_AMOUNT);

      const after = await ethers.provider.getBalance(freelancer.address);
      expect(after - before).to.equal(FUND_AMOUNT);
    });

    it("should set job status to Completed", async () => {
      await escrow.connect(client).releasePayment(0);
      const [, , , status] = await escrow.getJob(0);
      expect(status).to.equal(2); // Completed
    });

    it("should revert if caller is not the client", async () => {
      await expect(
        escrow.connect(stranger).releasePayment(0)
      ).to.be.revertedWith("FreelanceEscrow: not the client");
    });

    it("should revert on double release (prevent double spending)", async () => {
      await escrow.connect(client).releasePayment(0);
      await expect(
        escrow.connect(client).releasePayment(0)
      ).to.be.revertedWith("FreelanceEscrow: job not funded");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // refund
  // ──────────────────────────────────────────────────────────────────────────

  describe("refund", () => {
    beforeEach(async () => {
      await escrow.connect(client).createJob(freelancer.address, JOB_DESCRIPTION);
      await escrow.connect(client).fundJob(0, { value: FUND_AMOUNT });
    });

    it("should refund ETH to client and emit Refunded", async () => {
      const before = await ethers.provider.getBalance(client.address);
      await expect(escrow.connect(freelancer).refund(0))
        .to.emit(escrow, "Refunded")
        .withArgs(0, client.address, FUND_AMOUNT);

      const after = await ethers.provider.getBalance(client.address);
      expect(after - before).to.equal(FUND_AMOUNT);
    });

    it("should set job status to Refunded", async () => {
      await escrow.connect(freelancer).refund(0);
      const [, , , status] = await escrow.getJob(0);
      expect(status).to.equal(3); // Refunded
    });

    it("should revert if caller is not the freelancer", async () => {
      await expect(escrow.connect(stranger).refund(0)).to.be.revertedWith(
        "FreelanceEscrow: not the freelancer"
      );
    });

    it("should revert if job is pending (not funded)", async () => {
      await escrow.connect(client).createJob(freelancer.address, "Job 2");
      await expect(escrow.connect(freelancer).refund(1)).to.be.revertedWith(
        "FreelanceEscrow: job not funded"
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // executeMetaTx
  // ──────────────────────────────────────────────────────────────────────────

  describe("executeMetaTx", () => {
    it("should create a job via meta-tx (relayer pays gas)", async () => {
      const functionData = escrow.interface.encodeFunctionData("createJob", [
        freelancer.address,
        JOB_DESCRIPTION,
      ]);

      await executeViaMetaTx(client, functionData);

      const [c, f] = await escrow.getJob(0);
      expect(c).to.equal(client.address);
      expect(f).to.equal(freelancer.address);
    });

    it("should increment nonce after a successful meta-tx", async () => {
      const nonceBefore = await escrow.getNonce(client.address);

      const functionData = escrow.interface.encodeFunctionData("createJob", [
        freelancer.address,
        JOB_DESCRIPTION,
      ]);
      await executeViaMetaTx(client, functionData);

      const nonceAfter = await escrow.getNonce(client.address);
      expect(nonceAfter).to.equal(nonceBefore + 1n);
    });

    it("should revert if signature is invalid (wrong signer)", async () => {
      const functionData = escrow.interface.encodeFunctionData("createJob", [
        freelancer.address,
        JOB_DESCRIPTION,
      ]);

      // stranger signs but we claim it came from client
      const badSig = await buildMetaTxSignature(stranger, functionData);
      await expect(
        escrow
          .connect(relayer)
          .executeMetaTx(client.address, functionData, badSig)
      ).to.be.revertedWith("FreelanceEscrow: invalid signature");
    });

    it("should prevent replay attacks (same signature reused)", async () => {
      const functionData = escrow.interface.encodeFunctionData("createJob", [
        freelancer.address,
        JOB_DESCRIPTION,
      ]);

      const signature = await buildMetaTxSignature(client, functionData);

      // First use succeeds
      await escrow
        .connect(relayer)
        .executeMetaTx(client.address, functionData, signature);

      // Replaying with the same signature must fail
      await expect(
        escrow
          .connect(relayer)
          .executeMetaTx(client.address, functionData, signature)
      ).to.be.revertedWith("FreelanceEscrow: invalid signature");
    });

    it("should fund a job via meta-tx with ETH forwarded", async () => {
      // First create the job directly
      await escrow.connect(client).createJob(freelancer.address, JOB_DESCRIPTION);

      const functionData = escrow.interface.encodeFunctionData("fundJob", [0]);

      // Meta-tx with ETH value
      await executeViaMetaTx(client, functionData, { value: FUND_AMOUNT });

      const [, , amount, status] = await escrow.getJob(0);
      expect(amount).to.equal(FUND_AMOUNT);
      expect(status).to.equal(1); // Funded
    });

    it("should reject zero address as from", async () => {
      const functionData = escrow.interface.encodeFunctionData("createJob", [
        freelancer.address,
        JOB_DESCRIPTION,
      ]);
      const sig = "0x" + "00".repeat(65);
      await expect(
        escrow
          .connect(relayer)
          .executeMetaTx(ethers.ZeroAddress, functionData, sig)
      ).to.be.revertedWith("FreelanceEscrow: zero address");
    });
  });
});
