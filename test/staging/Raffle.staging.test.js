const { assert, expect } = require("chai")
const { ethers, deployments, getNamedAccounts, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle unit test", async function () {
          let raffle, entranceFee, deployer
          //const chainId = network.config.chainId
          //const entranceFee = networkConfig[chainId]["entranceFee"]

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              // player = (await getNamedAccounts()).player
              // [deployer, player] = await ethers.getSigners()
              // await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              //vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              entranceFee = await raffle.getEntranceFee()
              //interval = await raffle.getInterval()
          })
          describe("fulfillRandomWords", function () {
              it("works with Chainlink Keepers & VRF, picks a random winner", async function () {
                  console.log("Setting up test...")
                  const startingTimestamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  // set up the listener before entering the raffle
                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked enevt fired!")

                          try {
                              // asserts
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerBalanceAfter = await accounts[0].getBalance()
                              const endingTimestamp = await await raffle.getLatestTimeStamp()

                              await expect(raffle.getPlayer(0)).to.be.reverted // players[] has been reset
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerBalanceAfter.toString(),
                                  winnerBalanceBefore.add(entranceFee).toString()
                              )
                              assert.isAbove(
                                  endingTimestamp,
                                  startingTimestamp,
                                  "ending timestamp > starting"
                              )
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })

                      // Entering the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: entranceFee })
                      await tx.wait(1)
                      console.log("Time to wait...")
                      const winnerBalanceBefore = await accounts[0].getBalance()
                  })
              })
          })
      })
