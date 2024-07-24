// SPDX-License-Identifier: MIT


pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interface/IBetManager.sol";


contract BetManager is IBetManager {
    mapping(bytes32 => Bet) bets;
    mapping(bytes32 => mapping(BetOption => uint256)) public odds;
    address public admin;
    mapping (bytes32 => Match) public matches;
    address  token;

    constructor(address _token) {
        admin = msg.sender;
        token = _token;
    }

    function setAdmin(address _admin) external payable {
        require(msg.sender == admin, "Unauthorized");
        admin = _admin;
    }

    function createMatch(bytes32 matchId, string memory name, string memory competition, uint32 startTime) external payable {
        require(msg.sender == admin, "Unauthorized");
        require(matches[matchId].exists == false, "Match has been created");
        Match storage m = matches[matchId];
        m.name = name;
        m.competition = competition;
        m.startTime = startTime;
        m.status = MatchStatus.Pending;
        m.exists = true;
        emit createMatchEvent(matchId, name, competition, startTime);
    }

    function updateMatch(bytes32 matchId, MatchStatus status, BetOption result) external payable {
        require(msg.sender == admin, "Unauthorized");
        require(matches[matchId].exists == true, "Can not find match");
        Match storage m = matches[matchId];
        m.status  = status;
        m.result = result;
        emit updateMatchEvent(matchId, status, result);
    }



    function TotalBet(bytes32 competitionId) internal view  returns(uint256) {
        return odds[competitionId][BetOption.AwayWin] + odds[competitionId][BetOption.HomeWin] + odds[competitionId][BetOption.Draw];
    }


    function createBet(bytes32 matchId, bytes32 betId, BetOption option, uint256 amount) external payable {
        require(matches[matchId].exists, "Match does not exists");
        require(matches[matchId].status == MatchStatus.Pending, "Bet is closed");
        require(amount > 0, "Bet amount must be greater than zero");
        Bet storage bet = bets[betId];
        bet.amount = amount;
        bet.matchId = matchId;
        bet.betId = betId;
        bet.option = option;
        bet.uid = msg.sender;
        bet.exists = true;
        // transfer erc20
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        odds[matchId][option] += amount;
        emit createBetEvent(matchId, betId, msg.sender, option, amount);
    }


    function calculateOdd(bytes32 matchId, BetOption option) view  internal returns(uint32) {
        return uint32((odds[matchId][BetOption.HomeWin] + odds[matchId][BetOption.Draw] + odds[matchId][BetOption.AwayWin]) * 10000 / odds[matchId][option]);
    }

    function claimReward(bytes32 betId) external payable {
        require(bets[betId].exists, "Bet does not exist");
        require(bets[betId].uid == msg.sender, "Unautherized");
        bytes32 matchId = bets[betId].matchId;
        require(matches[matchId].status == MatchStatus.Finished, "Match has not finished");
        require(matches[matchId].result == bets[betId].option, "You lost");
        uint256 reward = bets[betId].amount * calculateOdd(matchId, bets[betId].option) / 10000;
        IERC20(token).transfer(msg.sender, reward);
        emit claimRewardEvent(betId, msg.sender, reward);
    }

    function getOdds(bytes32 matchId) external view returns(uint256, uint256, uint256) {
        return (odds[matchId][BetOption.HomeWin], odds[matchId][BetOption.Draw], odds[matchId][BetOption.AwayWin]);
    }

    function getBet(bytes32 betId) external view returns(Bet memory) {
        return bets[betId];
    }


    function getMatch(bytes32 matchId) external view returns(Match memory) {
        return matches[matchId];   
    }
}