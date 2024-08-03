// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interface/IGmpReceiver.sol";
import "lib/PrimitiveUtils.sol";
import "./interface/IGateway.sol";


contract CBUSD is ERC20, IGmpReceiver {
    using PrimitiveUtils for GmpSender;

    address public admin;
    IGateway  public gateway;
    mapping(uint16 => address) public tokens;
    uint32 constant  public MAX_GAS_LIMIT = 100_000;

    struct TeleportCommand {
        address from;
        address to;
        uint256 amount;
    }

    event InboundTransfer(bytes32 indexed id, address from, address to, uint256 amount);
    event OutboundTransfer(bytes32 indexed id, address from, address to, uint256 amount);



    constructor(string memory name, string memory symbol, uint256 initialSupply, IGateway _gateway) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply * (10 ** uint256(decimals())));
        gateway = _gateway;
    }

    function updateContractList(uint16 _networkId, address token) external payable {
        require(msg.sender == admin, "unauthorized");
        tokens[_networkId] = token;
    }

    function getToken(uint16 _networkId) external payable returns(address) {
        return tokens[_networkId];
    }


    function onGmpReceived(bytes32 id, uint128 network, bytes32 source, bytes calldata payload)
    external
    payable
    returns (bytes32) {
        address senderAddr = GmpSender.wrap(source).toAddress();
        require(msg.sender == address(gateway), "Unauthorized gateway");
        require(tokens[uint16(network)] == senderAddr, "Unauthorized Network");

        TeleportCommand memory command = abi.decode(payload, (TeleportCommand));
        _mint(command.to, command.amount);
        emit InboundTransfer(id, command.from, command.to, command.amount);
        return  id;
    }

    function teleport(address recipient,  uint16 _networkId, uint256 amount) external payable returns(bytes32) {
        _burn(msg.sender, amount);
        bytes memory message = abi.encode(TeleportCommand({from: msg.sender, to: recipient, amount: amount}));
        bytes32 messageId = gateway.submitMessage(tokens[_networkId], _networkId, MAX_GAS_LIMIT, message);
        emit OutboundTransfer(messageId, msg.sender, recipient, amount);
        return messageId;
    }
}