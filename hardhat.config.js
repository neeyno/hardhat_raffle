require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-ethers")
require("dotenv").config()
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("hardhat-gas-reporter")
require("solidity-coverage")
require("hardhat-contract-sizer")

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const ALCHEMY_RINKEBY_URL = process.env.ALCHEMY_RINKEBY_URL || "https://eth-rinkeby/example..."
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x141..."
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "other key"
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "other key"

module.exports = {
    solidity: "0.8.8",
    defaultNetwork: "hardhat",
    networks: {
        rinkeby: {
            url: ALCHEMY_RINKEBY_URL,
            accounts: [PRIVATE_KEY],
            chainId: 4, // rinkeby chainId is 4
            blockConfirmations: 6,
        },
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        localhost: {
            url: "http://127.0.0.1:8545/",
            chainId: 31337,
            blockConfirmations: 1,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0, // this will by default take the first account as deployer
        },
        player: {
            default: 1,
        },
    },
    etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            rinkeby: ETHERSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: false,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        //coinmarketcap: COINMARKETCAP_API_KEY,
    },
    mocha: {
        timeout: 500000, // 300sec max
    },
}
