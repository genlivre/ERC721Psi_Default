const { expect, use } = require('chai')
const { ethers } = require('hardhat')
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

use(require('chai-as-promised'))

const weiToEther = (wei) => {
  return wei / 1000000000000000000
}

describe('baseURI', function () {
  it('baseURIが更新されることを確認', async () => {
    const [account] = await ethers.getSigners()
    const contract = await ethers.getContractFactory('TOKEN')
    const token = await contract.deploy()
    await token.deployed()

    // パブリックセール開始を設定
    await token.setPubsale(true)
    expect(await token.pubSaleStart()).to.equal(true)

    // pubMintが叩けることを確認
    const quantity = 1
    let pubPrice = await token.PUB_PRICE()
    pubPrice = weiToEther(Number(pubPrice))

    const cost = String((pubPrice * 1000 * (quantity * 1000)) / 1000000)

    expect(
      await token.connect(account).pubMint(quantity, {
        value: ethers.utils.parseEther(cost),
      })
    )

    // URIを設定
    const baseURI = 'https://example.com/'
    const unrevealedURI = 'https://example.com/not-revealed.json'
    await token.setBaseURI(baseURI)
    await token.setUnrevealedURI(unrevealedURI)

    // リビール前のtokenURIを検証
    await token.ownerMint(account.address, 1)
    const tokenId = 1
    let tokenURI = await token.tokenURI(tokenId)
    expect(tokenURI).to.equal(unrevealedURI)

    // リビール後のtokenURIを検証
    await token.reveal(true)
    tokenURI = await token.tokenURI(tokenId)
    expect(tokenURI).to.equal(`${baseURI}${tokenId}.json`)

    // balanceOf
    const balanceOf = await token.balanceOf(account.address)
    console.log('balanceOf: ', balanceOf)
  })
})

describe('WhitelistSale', function () {
  it('Whitelistに登録されているアカウントのみがMINTできることを確認', async () => {
    const accounts = await ethers.getSigners()
    const contract = await ethers.getContractFactory('TOKEN')
    const token = await contract.deploy()
    await token.deployed()

    const whitelisted = accounts.slice(0, 5)
    const notWhitelisted = accounts.slice(5, 10)

    const leaves = whitelisted.map((account) => keccak256(account.address))
    const tree = new MerkleTree(leaves, keccak256, { sort: true })
    const merkleRoot = tree.getHexRoot()
    const rootHash = tree.getRoot()

    await token.setMerkleRoot(merkleRoot)

    // 登録するmerkleRootと、登録されているmerkleRootが一致することを確認
    expect(await token.merkleRoot()).to.equal(merkleRoot)

    const checkIncludeWhitelist = (addr) => {
      const keccakAddr = keccak256(addr)
      const hexProof = tree.getHexProof(keccakAddr)
      const result = tree.verify(hexProof, keccakAddr, rootHash)
      console.log(addr, 'included in the white list?:', result)

      return result
    }

    const whitelistUserCheck = checkIncludeWhitelist(whitelisted[0].address)
    const notWhitelistUserCheck = checkIncludeWhitelist(
      notWhitelisted[0].address
    )

    // ホワリスアドレス・ホワリス外アドレスがきちんと認証されるかを確認
    expect(whitelistUserCheck).to.equal(true)
    expect(notWhitelistUserCheck).to.equal(false)

    // プレセール開始を設定
    await token.setPresale(true)
    expect(await token.preSaleStart()).to.equal(true)

    const getHexProof = (addr) => {
      const keccakAddr = keccak256(addr)
      const hexProof = tree.getHexProof(keccakAddr)
      return hexProof
    }

    // quantityがmint可能数を超えてMintできないことを確認i
    let quantity = 100
    let prePrice = await token.PRE_PRICE()
    prePrice = weiToEther(Number(prePrice))
    let cost = String((prePrice * 1000 * (quantity * 1000)) / 1000000)

    const validMerkleProof = getHexProof(whitelisted[0].address)

    await expect(
      token.preMint(quantity, validMerkleProof, {
        value: ethers.utils.parseEther(cost),
      })
    ).to.be.rejectedWith('Mint quantity over')

    // ホワリスアドレスで、preMintが叩けることを確認
    quantity = 1
    cost = String((prePrice * 1000 * (quantity * 1000)) / 1000000)
    expect(
      token.preMint(quantity, validMerkleProof, {
        value: ethers.utils.parseEther(cost),
      })
    )

    // preMint可能枚数を超えてが叩けないことを確認
    quantity = 100
    await expect(
      token.preMint(quantity, validMerkleProof, {
        value: ethers.utils.parseEther(cost),
      })
    ).to.be.rejectedWith('Mint quantity over')

    // ホワリス外アドレスで、preMintが叩けないことを確認
    quantity = 1
    const invalidMerkleProof = getHexProof(notWhitelisted[0].address)
    await expect(
      token.connect(notWhitelisted[0]).preMint(quantity, invalidMerkleProof, {
        value: ethers.utils.parseEther(cost),
      })
    ).to.be.rejectedWith('Invalid Merkle Proof')

    // パブリックセール
    // mintLimitを変更
    await token.setMintLimit(5)
    const mintLimit = await token.mintLimit()
    expect(Number(mintLimit)).to.equal(5)

    await token.setPubsale(true)
    expect(await token.pubSaleStart()).to.equal(true)

    let pubPrice = await token.PUB_PRICE()
    pubPrice = weiToEther(Number(pubPrice))
    quantity = 5
    cost = String((pubPrice * 1000 * (quantity * 1000)) / 1000000)

    expect(
      await token.connect(notWhitelisted[0]).pubMint(quantity, {
        value: ethers.utils.parseEther(cost),
      })
    )

    // 全トークンがMINTされたら追加でMINTできないことを確認
    const maxSupply = await token.MAX_SUPPLY()
    let totalSupply = await token.totalSupply()
    const remainCount = Number(maxSupply) - Number(totalSupply)
    await token.ownerMint(notWhitelisted[0].address, remainCount)

    totalSupply = await token.totalSupply()
    expect(totalSupply).to.equal(maxSupply)

    await expect(
      token.ownerMint(notWhitelisted[0].address, 1)
    ).to.be.rejectedWith('Max supply over')

    await expect(
      token.preMint(1, validMerkleProof, {
        value: ethers.utils.parseEther(cost),
      })
    ).to.be.rejectedWith('Max supply over')

    await expect(
      token.pubMint(1, {
        value: ethers.utils.parseEther(cost),
      })
    ).to.be.rejectedWith('Max supply over')
  })
})

describe('withdraw', function () {
  it('出金を確認', async () => {
    const [account1, account2] = await ethers.getSigners()
    const contract = await ethers.getContractFactory('TOKEN')
    const token = await contract.deploy()
    await token.deployed()

    // pubMint
    await token.setPubsale(true)
    await token.setMintLimit(5)
    const quantity = 5
    let pubPrice = await token.PUB_PRICE()
    pubPrice = weiToEther(Number(pubPrice))
    const cost = String((pubPrice * 1000 * (quantity * 1000)) / 1000000)
    await token
      .connect(account1)
      .pubMint(quantity, { value: ethers.utils.parseEther(cost) })
    await token
      .connect(account2)
      .pubMint(quantity, { value: ethers.utils.parseEther(cost) })

    await expect(token.withdraw()).to.be.rejectedWith(
      'Please set member address'
    )

    // メンバーのアドレスを設定する
    const address = {
      founder: '0xB198c2506B5D8571e43E88Cd669789179F551d0C',
      illustrator: '0xB198c2506B5D8571e43E88Cd669789179F551d0C',
      developer: '0xB198c2506B5D8571e43E88Cd669789179F551d0C',
      marketer: '0xB198c2506B5D8571e43E88Cd669789179F551d0C',
      musician: '0xB198c2506B5D8571e43E88Cd669789179F551d0C',
    }

    // 報酬分配先を登録
    await token.setMemberAddress(
      address.founder,
      address.illustrator,
      address.developer,
      address.marketer,
      address.musician
    )

    await token.withdraw()
  })
})

describe('OpenSea Operator Filterの確認', function () {
  it('OpenSea Operator Filterの確認', async () => {
    const [alice, bob] = await ethers.getSigners()
    const contract = await ethers.getContractFactory('TOKEN')
    const token = await contract.deploy()
    await token.deployed()

    let operatorFilteringEnabled = await token.operatorFilteringEnabled()
    expect(operatorFilteringEnabled).to.equal(true) // OperatorFilter ON

    await token.setOperatorFilteringEnabled(false)
    operatorFilteringEnabled = await token.operatorFilteringEnabled()
    expect(operatorFilteringEnabled).to.equal(false) // OperatorFilter OFF
  })
})

// describe('tokenIdが1~1000になるかをチェック', function () {
//   it('tokenIdが1~1000になるかをチェック', async () => {
//     const [account] = await ethers.getSigners()
//     const contract = await ethers.getContractFactory('TOKEN')
//     const token = await contract.deploy()
//     await token.deployed()

//     await token.ownerMint(account.address, 1000 - 150)
//     const totalSupply = await token.totalSupply()
//     console.log(totalSupply)

//     let tokenOfOwnerByIndex = await token.tokenOfOwnerByIndex(
//       account.address,
//       1
//     )
//     console.log(tokenOfOwnerByIndex)

//     tokenOfOwnerByIndex = await token.tokenOfOwnerByIndex(account.address, 1)
//     console.log(tokenOfOwnerByIndex)
//   })
// })
