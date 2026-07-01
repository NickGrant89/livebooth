import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiveBooth contracts", () => {
  it("splits tips 90/10", async () => {
    const [platform, dj, fan] = await ethers.getSigners();

    const DropToken = await ethers.getContractFactory("DropToken");
    const drop = await DropToken.deploy();
    await drop.waitForDeployment();

    const TipRouter = await ethers.getContractFactory("TipRouter");
    const router = await TipRouter.deploy(await drop.getAddress(), platform.address);
    await router.waitForDeployment();

    const amount = ethers.parseEther("100");
    await drop.transfer(fan.address, amount);
    await drop.connect(fan).approve(await router.getAddress(), amount);

    await router.connect(fan).tip(dj.address, amount, ethers.id("stream-1"));

    expect(await drop.balanceOf(dj.address)).to.equal(ethers.parseEther("90"));
    expect(await drop.balanceOf(platform.address)).to.equal(
      ethers.parseEther("1000000000") - ethers.parseEther("100") + ethers.parseEther("10"),
    );
  });

  it("claims achievement rewards with signature", async () => {
    const [signer, user] = await ethers.getSigners();

    const DropToken = await ethers.getContractFactory("DropToken");
    const drop = await DropToken.deploy();
    await drop.waitForDeployment();

    const AchievementVault = await ethers.getContractFactory("AchievementVault");
    const vault = await AchievementVault.deploy(await drop.getAddress(), signer.address);
    await vault.waitForDeployment();

    const fund = ethers.parseEther("1000");
    await drop.approve(await vault.getAddress(), fund);
    await vault.fund(fund);

    const claimId = ethers.id("user-1:first-tip");
    const amount = ethers.parseEther("50");
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const claimHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes32", "uint256", "uint256"],
        [user.address, claimId, amount, deadline],
      ),
    );
    const signature = await signer.signMessage(ethers.getBytes(claimHash));

    await vault.connect(user).claim(claimId, amount, deadline, signature);
    expect(await drop.balanceOf(user.address)).to.equal(amount);
  });
});
