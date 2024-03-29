const { network, ethers } = require("hardhat")
const fs = require("fs")

const FRONTEND_ADDRESSES_FILE = "../nextjs_raffle/constants/contractAddresses.json"
const FRONTEND_ABI_FILE = "../nextjs_raffle/constants/abi.json"

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle")
    const currentAddresses = JSON.parse(fs.readFileSync(FRONTEND_ADDRESSES_FILE, "utf8"))
    const chainId = network.config.chainId.toString()

    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(raffle.address)) {
            currentAddresses[chainId].push(raffle.address)
        }
    } else {
        currentAddresses[chainId] = [raffle.address]
    }
    //currentAddresses[chainId] = [raffle.address]
    fs.writeFileSync(FRONTEND_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")
    fs.writeFileSync(FRONTEND_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json))
    //const chainId = network.config.chainId.toString()
}

module.exports = async function () {
    if (process.env.UPDATE_FRONTEND) {
        console.log("Updating frontend")
        await updateContractAddresses()
        await updateAbi()
        console.log("------------------------------------------")
    }
}

module.exports.tags = ["all", "frontend"]
