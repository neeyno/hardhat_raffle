const { network, getNamedAccounts, deployments } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    BASE_FEE,
    GAS_LINK_PRICE,
} = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    //const chainId = network.config.chainId
    log(`Network: ${network.name}`)

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")
        // deploying vfrCoordinatorV2
        await deploy("VRFCoordinatorV2Mock", {
            contract: "VRFCoordinatorV2Mock",
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_LINK_PRICE], // constructor(uint96 _baseFee, uint96 _gasPriceLink)
        })
        log("Mocks deployed!")
        log("------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
