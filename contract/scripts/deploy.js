async function main() {
  const TOKEN = await ethers.getContractFactory('TOKEN')
  const contract = await TOKEN.deploy()
  console.log('Contract deployed to address:', contract.address)
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
