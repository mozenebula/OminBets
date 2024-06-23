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
const betId = "0x67fdd7a79cf4de94db40504e779c25cf8db72daed52ad5ffdd53633fcb174c12";
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
        const [owner, otherAccount] = await ethers.getSigners();

        const BetManager = await ethers.getContractFactory("BetManager");
        const betManager = await BetManager.deploy();
        return {betManager, owner, otherAccount};
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
            await expect(betManager.createBet(matchIdOne, betId, BetOption.HomeWin, 100)).to.be.revertedWith("Match does not exists");
        });
        it("Should be reverted if match has been opened", async function() {
            const {betManager} = await loadFixture(deployContract);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await betManager.updateMatch(matchIdOne, MatchStatus.Finished, BetOption.HomeWin);
            await expect(betManager.createBet(matchIdOne, betId, BetOption.HomeWin, 100)).to.be.revertedWith("Bet is closed");          
        });
        it("Should be reverted if betOption is invaild", async function() {
            const {betManager} = await loadFixture(deployContract);
            await betManager.createMatch(matchIdOne, matchName, competition, matchDate);
            await expect(betManager.createBet(matchIdOne, betId, BetOption.HomeWin, 0)).to.be.revertedWith("Bet amount must be greater than zero");          
        })

    })



    
  })


 


