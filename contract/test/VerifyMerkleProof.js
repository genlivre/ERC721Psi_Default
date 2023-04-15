const { expect, use } = require('chai')
const { ethers } = require('hardhat')
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

use(require('chai-as-promised'))

const weiToEther = (wei) => {
  return wei / 1000000000000000000
}

describe('VerifyMerkleProof', function () {
  it('アドレスと数量の組み合わせでMerkleProofを検証', async () => {
    const accounts = await ethers.getSigners()
    const VerifyMerkleProof = await ethers.getContractFactory(
      'VerifyMerkleProof'
    )
    const contract = await VerifyMerkleProof.deploy()
    await contract.deployed()

    const whitelisted = accounts.slice(0, 5)
    const notWhitelisted = accounts.slice(5, 10)

    const wlSize = 10 // 付与するWLの個数

    const leaves = whitelisted.map((account) =>
      keccak256(
        Buffer.from(
          account.address.slice(2) + wlSize.toString(16).padStart(64, '0'),
          'hex'
        )
      )
    )
    const tree = new MerkleTree(leaves, keccak256, { sort: true })
    const merkleRoot = tree.getHexRoot()
    const rootHash = tree.getRoot()

    const getHexProof = (addr, size) => {
      const keccakAddr = keccak256(
        Buffer.from(addr.slice(2) + size.toString(16).padStart(64, '0'), 'hex')
      )
      const hexProof = tree.getHexProof(keccakAddr)
      return hexProof
    }

    let result = await contract.verify(
      whitelisted[0].address,
      wlSize,
      merkleRoot,
      getHexProof(whitelisted[0].address, wlSize)
    )
    expect(result).to.equal(true)

    result = await contract.verify(
      notWhitelisted[0].address,
      wlSize,
      merkleRoot,
      getHexProof(notWhitelisted[0].address, wlSize)
    )
    expect(result).to.equal(false)
  })
})
