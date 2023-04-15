// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract VerifyMerkleProof {
    // アドレスと数量を検証する関数
    function verify(
        address _address,
        uint256 _amount,
        bytes32 _merkleRoot,
        bytes32[] calldata _merkleProof
    ) external pure returns (bool) {
        // アドレスと数量を組み合わせた文字列を作成し、そのハッシュを計算
        bytes32 leaf = keccak256(abi.encodePacked(_address, _amount));

        // MerkleProofライブラリのverify関数を使って検証
        return MerkleProof.verifyCalldata(_merkleProof, _merkleRoot, leaf);
    }
}
