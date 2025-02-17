// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

interface IBetManager {
    enum BetOption{ HomeWin, Draw, AwayWin}

    enum MatchStatus {Pending, Finished, Cancel}

    struct Match {
        string name;
        MatchStatus status;
        BetOption result;
        string competition;
        uint32 startTime;
        bool exists;
    }


    struct Bet {
        bytes32 betId;
        bytes32 matchId;
        address uid;
        BetOption option;
        uint256 amount;
        bool exists;
        bool hasClaimed;
    }

    function setAdmin(address _admin) external payable;
    function createMatch(bytes32 matchId, string memory name, string memory competition, uint32 startTime) external payable;
    function updateMatch(bytes32 matchId, MatchStatus status, BetOption result) external payable ;
    function getMatch(bytes32 matchId) external view returns(Match memory);
    function createBet(bytes32 matchId, bytes32 betId, BetOption option, uint256 amount) external payable;
    function claimReward(bytes32 betId) external payable ;
    function getOdds(bytes32 matchId) external view returns(uint256, uint256, uint256) ;
    function getBet(bytes32 betId) external view returns(Bet memory);

    event createMatchEvent(bytes32 indexed matchId, string name, string competion, uint32 startTime);
    event updateMatchEvent(bytes32 indexed matchId, MatchStatus status, BetOption result);
    event createBetEvent(bytes32 matchId, bytes32 betId, address indexed uid, BetOption option, uint256 amount);
    event claimRewardEvent(bytes32 betId, address indexed  uid, uint256 reward);
}