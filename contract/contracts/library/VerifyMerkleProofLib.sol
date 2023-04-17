// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

library VerifyMerkleProofLib {
    function verifyAddress(
        address _address,
        bytes32 _merkleRoot,
        bytes32[] calldata _merkleProof
    ) external pure returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_address));
        return MerkleProof.verify(_merkleProof, _merkleRoot, leaf);
    }

    function verifyAddressAndAmount(
        address _address,
        uint256 _amount,
        bytes32 _merkleRoot,
        bytes32[] calldata _merkleProof
    ) external pure returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_address, _amount));
        return MerkleProof.verify(_merkleProof, _merkleRoot, leaf);
    }
}
