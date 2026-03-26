import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers } from "hardhat";
const { upgrades } = require("hardhat");
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MilestoneEscrow (UUPS)", function () {
  let escrow: any;
  let registry: any;
  let admin: HardhatEthersSigner;
  let client: HardhatEthersSigner;
  let freelancer: HardhatEthersSigner;
  let other: HardhatEthersSigner;
  let relayer: HardhatEthersSigner;

  beforeEach(async function () {
    [admin, client, freelancer, other, relayer] = await ethers.getSigners();

    // Deploy Escrow Proxy without registry first

    // Deploy Escrow Proxy
    const EscrowFactory = await ethers.getContractFactory("MilestoneEscrow");
    escrow = await upgrades.deployProxy(EscrowFactory, [
      ethers.ZeroAddress,
      admin.address,
    ], { unsafeAllow: ["constructor"] });
    await escrow.waitForDeployment();

    // We deploy Registry after Escrow proxy like in our script.
    
    const Reg2 = await ethers.getContractFactory("ReputationRegistry");
    registry = await Reg2.deploy(await escrow.getAddress());
    await registry.waitForDeployment();

    // We can't update escrow's registry easily after init without a setter.
    // Wait, MilestoneEscrow doesn't have a specific `setRegistry` function. 
    // We will deploy a new Escrow for each test with the correct registry if needed, 
    // but usually in a DApp they are linked tightly.
  });

  describe("Initialization & Upgrades", function () {
    it("Should set the admin correctly", async function () {
      expect(await escrow.admin()).to.equal(admin.address);
    });

    it("Should prevent non-admins from upgrading the contract", async function () {
      const EscrowFactoryV2 = await ethers.getContractFactory("MilestoneEscrow"); // Using same logic just for upgrade test
      await expect(
        upgrades.upgradeProxy(await escrow.getAddress(), EscrowFactoryV2.connect(client), { unsafeAllow: ["constructor"] })
      ).to.be.revertedWith("ME: not admin");
    });

    it("Should allow the admin to upgrade the contract", async function () {
      const EscrowFactoryV2 = await ethers.getContractFactory("MilestoneEscrow");
      const newProxy = await upgrades.upgradeProxy(
        await escrow.getAddress(),
        EscrowFactoryV2.connect(admin),
        { unsafeAllow: ["constructor"] }
      );
      expect(await newProxy.getAddress()).to.equal(await escrow.getAddress());
    });
  });

  describe("Job & Milestone Creation", function () {
    it("Should revert if milestone amount exceeds beta limit (0.5 ETH)", async function () {
      const maxLimit = ethers.parseEther("0.51");
      await expect(
        escrow.connect(client).createJobWithMilestones("J1", "Desc", ["M1"], [maxLimit], [freelancer.address])
      ).to.be.revertedWith("ME: ms amount exceeds beta limit");
    });

    it("Should successfully create a job", async function () {
      const tx = await escrow.connect(client).createJobWithMilestones("J1", "Desc", ["M1"], [ethers.parseEther("0.1")], [freelancer.address]);
      await tx.wait();

      expect(await escrow.jobCount()).to.equal(1);
      const job = await escrow.getJob(0);
      expect(job[0]).to.equal(client.address);
      expect(job[5]).to.equal(1); // milestoneCount
    });
  });

  describe("Funding & Security Circuit Breakers", function () {
    let jobId: number;

    beforeEach(async function () {
      await escrow.connect(client).createJobWithMilestones("J1", "Desc", ["M1"], [ethers.parseEther("0.1")], [freelancer.address]);
      jobId = Number(await escrow.jobCount()) - 1;
    });

    it("Should successfully fund a milestone and emit event", async function () {
      const tx = await escrow.connect(client).fundMilestone(jobId, 0, { value: ethers.parseEther("0.1") });
      await expect(tx).to.emit(escrow, "MilestoneFunded").withArgs(jobId, 0, ethers.parseEther("0.1"));
      
      const ms = await escrow.getMilestone(jobId, 0);
      expect(ms[3]).to.equal(1); // Funded
    });

    it("Should revert funding if the contract is paused", async function () {
      await escrow.connect(admin).pause();
      
      await expect(
        escrow.connect(client).fundMilestone(jobId, 0, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(escrow, "EnforcedPause");
      
      await escrow.connect(admin).unpause();
      
      await escrow.connect(client).fundMilestone(jobId, 0, { value: ethers.parseEther("0.1") });
      const ms = await escrow.getMilestone(jobId, 0);
      expect(ms[3]).to.equal(1); // Funded
    });
  });

  describe("Resolution & State Changes", function () {
    let jobId: number;

    beforeEach(async function () {
      await escrow.connect(client).createJobWithMilestones("J1", "Desc", ["M1"], [ethers.parseEther("0.1")], [freelancer.address]);
      jobId = Number(await escrow.jobCount()) - 1;
      await escrow.connect(client).fundMilestone(jobId, 0, { value: ethers.parseEther("0.1") });
    });

    it("Should only allow freelancer to submit", async function () {
      await expect(
        escrow.connect(other).submitMilestone(jobId, 0)
      ).to.be.revertedWith("ME: not the assigned freelancer");

      await escrow.connect(freelancer).submitMilestone(jobId, 0);
      const ms = await escrow.getMilestone(jobId, 0);
      expect(ms[3]).to.equal(2); // Submitted
    });

    it("Should allow client to approve and transfer funds", async function () {
      await escrow.connect(freelancer).submitMilestone(jobId, 0);
      
      const prevBal = await ethers.provider.getBalance(freelancer.address);
      const tx = await escrow.connect(client).approveMilestone(jobId, 0, 5);
      await tx.wait();
      const newBal = await ethers.provider.getBalance(freelancer.address);
      
      expect(newBal > prevBal).to.be.true;
      
      const ms = await escrow.getMilestone(jobId, 0);
      expect(ms[3]).to.equal(3); // Approved
    });
  });
});
