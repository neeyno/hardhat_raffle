const { getNamedAccounts, deployments, network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
require("dotenv").config()

module.exports = async ({ getNamedAccounts, deployments }) => {
    //
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    log(`Network: ${network.name}`)

    // deploying mocks
    const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")
    let vrfCoordinatorV2Address, subscriptionId // constructor args
    if (developmentChains.includes(network.name)) {
        // const ethUsdAggregator = await deployments.get("MockV3Aggregator") // get the most recent deployment
        // ethUsdPriceFeedAddress = ethUsdAggregator.address
        //const vrfCoordinatorV2Mock = await deployments.get("VRFCoordinatorV2Mock") // get the most recent deployment
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

        const txResponse = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await txResponse.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        //fund the sub with some eth // fundSubscription(uint64 _subId, uint96 _amount)
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        //ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2Address"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    // constructor args
    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    const argsRaffle = [
        vrfCoordinatorV2Address, //_vrfCoordinator
        entranceFee, // eth value
        gasLane, //bytes32 gas lane key hash
        subscriptionId, // sub id funded with some eth/link token
        callbackGasLimit, // 500 000 ?
        interval, // 30sec
    ]

    // deploying raffle contract
    const raffle = await deploy("Raffle", {
        contract: "Raffle",
        from: deployer,
        args: argsRaffle, //  constructor args
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // verify raffle
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(raffle.address, argsRaffle)
    }

    log("------------------------------------------")
}

module.exports.tags = ["all", "raffle"]
