const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const matchName = "England vs Franch";
const competition = "EuroCup";
const matchDate = 1718896779;
const matchIdOne = "0x529ecfbe60e824d858b88c3f4a6a7e002a4e208c6ed32f4ec3a1c1834e0dfd3f";
const matchIdTwo = "0x67fdd7a79cf4de94db40504e779c25cf8db72daed52ad5ffdd53633fcb174c11";
const betIdOne = "0x67fdd7a79cf4de94db40504e779c25cf8db72daed52ad5ffdd53633fcb174c12";
const betIdTwo = "0x67fdd7a79cf4de94db40504e779c25cf8db72daed52ad5ffdd53633fcb174c13";
const betIdThree = "0x67fdd7a79cf4de94db40504e779c25cf8db72daed52ad5ffdd53633fcb174c14";
const MatchStatus = {
    Pending:0,
    Finished:1,
    Cancel:2
}

const BetOption = {
    HomeWin:0,
    Draw:1,
    AwayWin:2,
    Other:3
}

  describe("BetManager", function() {
    async function deployContract() {
        const OBContract = await ethers.getContractFactory("OB");
        const OB = await OBContract.deploy(100000);

        const [owner, otherAccount] = await ethers.getSigners();
        const BetManager = await ethers.getContractFactory("BetManager");
        const betManager = await BetManager.deploy(OB.target);
        return {betManager, owner, otherAccount, OB};
    }

    describe("Deployment", function() {
        it("Should be right ower", async function() {
            const {betManager, owner} = await loadFixture(deployContract);
            expect(await betManager.admin()).to.equal(owner.address);
        })
      });
    
    
    describe("setAdmin", function() {
        it("Should be reverted right if called by other account", async function() {
            const {betManager, otherAccount} = await loadFixture(deployContract);
            await expect(betManager.connect(otherAccount).setAdmin(otherAccount)).to.be.revertedWith("Unauthorized")
        });

        it("Should have changed the admin", async function() {
            const {betManager, otherAccount} =await loadFixture(deployContract);
            await betManager.setAdmin(otherAccount);
            expect(await betManager.admin()).to.equal(otherAccount);
        })
    })

    describe("createMatch", function() {
        it("Should be reverted right if called by other account", async function() {
            const {betManager, otherAccount} = await loadFixture(deployContract);
            await expect(betManager.connect(otherAccount).createMatch(matchIdOne, matchName, competition, matchDate)).to.be.revertedWith("Unauthorized")
        });

        it("Should be reverted right if match has been create", async function() {
            const {betManager} = await loadFixture(deployContract);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await expect(betManager.createMatch(matchIdOne, matchName, competition, matchDate)).to.be.revertedWith("Match has been created")
        });

        it("Should have created match", async function() {
            const {betManager} = await loadFixture(deployContract);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            const match = await betManager.getMatch(matchIdOne);
            expect(match.exists).to.be.true;
        });

        it("Should emit createMatchEvent", async function() {
            const {betManager} = await loadFixture(deployContract);
            await expect(betManager.createMatch(matchIdOne, matchName, competition, matchDate))
            .to.emit(betManager, "createMatchEvent").withArgs(matchIdOne, matchName, competition, matchDate);
        })
    });


    describe("updateMatch", function() {
        it("Should be reverted right if called by other account", async function() {
            const {betManager, otherAccount} = await loadFixture(deployContract);
            await expect(betManager.connect(otherAccount).updateMatch(matchIdOne, 1, 0)).to.be.revertedWith("Unauthorized")
        });

        it("Should be reverted right if match has been create", async function() {
            const {betManager} = await loadFixture(deployContract);
            await expect(betManager.updateMatch(matchIdOne, 1, 0)).to.be.revertedWith("Can not find match")
        });

        it("Should has changed match result", async function() {
            const {betManager} = await loadFixture(deployContract);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await betManager.updateMatch(matchIdOne, MatchStatus.Finished, BetOption.HomeWin);
            const match = await betManager.getMatch(matchIdOne);
            expect(match.status).to.equal(MatchStatus.Finished);
            expect(match.result).to.equal(BetOption.HomeWin);
        });

        it("Should emit updateMatchEvent", async function() {
            const {betManager} = await loadFixture(deployContract);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await expect(betManager.updateMatch(matchIdOne, MatchStatus.Finished, BetOption.HomeWin))
            .to.emit(betManager, "updateMatchEvent").withArgs(matchIdOne, MatchStatus.Finished, BetOption.HomeWin);
        });
    });

    describe("createBet", function() {
        it("Should be reverted if match has not been created", async function() {
            const {betManager} = await loadFixture(deployContract);
            await expect(betManager.createBet(matchIdOne, betIdOne, BetOption.HomeWin, 100)).to.be.revertedWith("Match does not exists");
        });
        it("Should be reverted if match has been opened", async function() {
            const {betManager} = await loadFixture(deployContract);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await betManager.updateMatch(matchIdOne, MatchStatus.Finished, BetOption.HomeWin);
            await expect(betManager.createBet(matchIdOne, betIdOne, BetOption.HomeWin, 100)).to.be.revertedWith("Bet is closed");          
        });
        it("Should be reverted if amount is not greater than 0", async function() {
            const {betManager} = await loadFixture(deployContract);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await expect(betManager.createBet(matchIdOne, betIdOne, BetOption.HomeWin, 0)).to.be.revertedWith("Bet amount must be greater than zero");          
        });


        it("Should have created Bet", async function() {
            const {betManager, OB} = await loadFixture(deployContract);
            const [ower, userOne] = await ethers.getSigners();
            await OB.transfer(userOne.address, 10000);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await OB.connect(userOne).approve(betManager.target, 5000);
            await betManager.connect(userOne).createBet(matchIdOne, betIdOne, BetOption.HomeWin, 5000);
            const bet = await betManager.getBet(betIdOne);
            const odds = await betManager.getOdds(matchIdOne);
            expect(await bet.exists).to.be.true;
            expect(await OB.balanceOf(userOne.address)).to.equal(5000);
            expect(await OB.balanceOf(betManager.target)).to.equal(5000);
            expect(odds[0]).to.equal(5000);
        })

        it("Should have emit createBetEvent", async function() {
            const {betManager, OB} = await loadFixture(deployContract);
            const [ower, userOne] = await ethers.getSigners();
            await OB.transfer(userOne.address, 10000);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await OB.connect(userOne).approve(betManager.target, 5000);
            await expect(betManager.connect(userOne).createBet(matchIdOne, betIdOne, BetOption.HomeWin, 5000)).to
            .emit(betManager, "createBetEvent").withArgs(matchIdOne, betIdOne, userOne.address, BetOption.HomeWin, 5000);
        });
    });

    describe("claimReward", function() {
        it("Should be reverted if bet is invaild", async function() {
            const {betManager} = await loadFixture(deployContract);
            await expect(betManager.claimReward(betIdOne)).to.revertedWith("Bet does not exist");
        });

        it("Should be reverted if unautherized", async function() {
            const {betManager, OB} = await loadFixture(deployContract);
            const [ower, userOne] = await ethers.getSigners();
            await OB.transfer(userOne.address, 10000);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await OB.connect(userOne).approve(betManager.target, 5000);
            await betManager.connect(userOne).createBet(matchIdOne, betIdOne, BetOption.HomeWin, 5000);
            await expect(betManager.claimReward(betIdOne)).to.revertedWith("Unautherized");
        })

        it("Should be reverted if match has not finished", async function() {
            const {betManager, OB} = await loadFixture(deployContract);
            const [ower, userOne] = await ethers.getSigners();
            await OB.transfer(userOne.address, 10000);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await OB.connect(userOne).approve(betManager.target, 5000);
            await betManager.connect(userOne).createBet(matchIdOne, betIdOne, BetOption.HomeWin, 5000);
            await expect(betManager.connect(userOne).claimReward(betIdOne)).to.revertedWith("Match has not finished");
        })

        it("Should be reverted if lost", async function() {
            const {betManager, OB} = await loadFixture(deployContract);
            const [ower, userOne] = await ethers.getSigners();
            await OB.transfer(userOne.address, 10000);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await OB.connect(userOne).approve(betManager.target, 5000);
            await betManager.connect(userOne).createBet(matchIdOne, betIdOne, BetOption.HomeWin, 5000);
            await betManager.updateMatch(matchIdOne, MatchStatus.Finished, BetOption.Draw);
            await expect(betManager.connect(userOne).claimReward(betIdOne)).to.revertedWith("You lost");
        })

        it("Should get reward if win", async function() {
            const {betManager, OB} = await loadFixture(deployContract);
            const [ower, userOne, userTwo, userThree] = await ethers.getSigners();
            await OB.transfer(userOne.address, 10000);
            await OB.transfer(userTwo.address, 10000);
            await OB.transfer(userThree.address, 10000);

            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);

            await OB.connect(userOne).approve(betManager.target, 5000);
            await OB.connect(userTwo).approve(betManager.target, 5000);
            await OB.connect(userThree).approve(betManager.target, 5000);

            await betManager.connect(userOne).createBet(matchIdOne, betIdOne, BetOption.HomeWin, 5000);
            await betManager.connect(userTwo).createBet(matchIdOne, betIdTwo, BetOption.HomeWin, 4000);
            await betManager.connect(userThree).createBet(matchIdOne, betIdThree, BetOption.AwayWin, 5000);

            await betManager.updateMatch(matchIdOne, MatchStatus.Finished, BetOption.HomeWin);
            await betManager.connect(userOne).claimReward(betIdOne)
            expect (await OB.balanceOf(userOne.address)).to.equal(12777)
        });

        it("Should have emit claimReardEvent", async function() {
            const {betManager, OB} = await loadFixture(deployContract);
            const [ower, userOne] = await ethers.getSigners();
            await OB.transfer(userOne.address, 10000);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await OB.connect(userOne).approve(betManager.target, 5000);
            await betManager.connect(userOne).createBet(matchIdOne, betIdOne, BetOption.HomeWin, 5000);
            await betManager.updateMatch(matchIdOne, MatchStatus.Finished, BetOption.HomeWin);
            await expect(betManager.connect(userOne).claimReward(betIdOne)).to
            .emit(betManager, "claimRewardEvent").withArgs(betIdOne, userOne.address, 5000);
        });
    });

  })


 


