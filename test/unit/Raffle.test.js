const { assert, expect } = require("chai")
const { ethers, deployments, getNamedAccounts, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle unit test", async function () {
          let raffle, vrfCoordinatorV2Mock, entranceFee, deployer, player, interval
          const chainId = network.config.chainId
          //const entranceFee = networkConfig[chainId]["entranceFee"]

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              // player = (await getNamedAccounts()).player
              // [deployer, player] = await ethers.getSigners()
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              entranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("Contructor", function () {
              it("initializes the raffle correctly", async function () {
                  const raffleState = await raffle.getRaffleState()
                  //const interval = await raffle.getInterval()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("Ether the raffle", function () {
              //   beforeEach(async function () {
              //       // player = (await getNamedAccounts()).player
              //   })

              it("reverts if not enough Eth sent", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETH")
              })

              it("records players when they enter", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  //const numPlayers = await raffle.getNumPlayers()
                  const playerZero = await raffle.getPlayer(0)

                  assert.equal(playerZero, deployer)
              })

              it("emits event on enter", async function () {
                  await expect(raffle.enterRaffle({ value: entranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })

              it("reverts entering if raffle state is not open", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([]) // bytes "performData"?

                  await expect(raffle.enterRaffle({ value: entranceFee })).to.be.revertedWith(
                      "Raffle__NotOpen"
                  )
              })
          })

          describe("CheckUpkeep", function () {
              it("returns false if players haven't sent any Eth", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  //const [upkeepNeeded] = await raffle.checkUpkeep([])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

                  assert.isFalse(upkeepNeeded)
              })

              it("returns false if raffle state is not open", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([]) // can also pass "0x"
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

                  assert.equal(raffleState.toString(), "1")
                  assert.isFalse(upkeepNeeded)
              })

              it("returns false if enough time hasn't passed", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 2])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

                  assert.isFalse(upkeepNeeded)
              })

              it("returns false if open, has players & eth, enough time has passed", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

                  assert.isTrue(upkeepNeeded)
              })
          })

          describe("PerformUpkeep", function () {
              it("reverts if CheckUpkeep is false", async function () {
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

                  assert.isFalse(upkeepNeeded)
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
                      "Raffle__UpkeepNotNeeded"
                  )
              })

              it("performs if CheckUpkeep is true", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep([])

                  assert(tx)
              })

              it("should change raffle state", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([])
                  const raffleState = await raffle.getRaffleState()

                  assert.equal(raffleState.toString(), "1")
              })

              it("should call random request", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await raffle.performUpkeep([])
                  const txReceipt = await txResponse.wait(1)
                  const requestId = txReceipt.events[1].args.requestId

                  assert.isAbove(requestId.toNumber(), 0, "requestId > 0")
                  //expect("requestId").to.be.calledOnContract(raffle)
              })

              it("emits event on requesting random", async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])

                  await expect(raffle.performUpkeep([])).to.emit(raffle, "RequestedRaffleWinner")
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  //const tx = await raffle.performUpkeep([])
              })

              it("can only be called after PerformUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request")

                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
              })

              it("picks the winner", async function () {
                  const additionalEntrance = 3
                  const startingAccountIndex = 1 // deployer =0
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrance;
                      i++
                  ) {
                      const accountConnected = raffle.connect(accounts[i])
                      await accountConnected.enterRaffle({ value: entranceFee })
                  }
                  const startingTimestamp = await raffle.getLatestTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          // console.log("found the event...")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const endingTimestamp = await raffle.getLatestTimeStamp()
                              const numPlayers = await raffle.getNumPlayers()
                              const winnerAfterBalance = await accounts[1].getBalance()

                              //   console.log(recentWinner)
                              //   console.log(accounts[0].address)
                              //   console.log(accounts[1].address)// winner?
                              //   console.log(accounts[2].address)
                              //   console.log(accounts[3].address)

                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert.isAbove(
                                  endingTimestamp,
                                  startingTimestamp,
                                  "ending > starting"
                              )
                              assert.equal(
                                  winnerAfterBalance.toString(),
                                  winnerBeforeBalance
                                      .add(entranceFee.mul(additionalEntrance))
                                      .add(entranceFee)
                                      .toString()
                              )
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      }) // setting up the listener
                      //below we will fire the event, and the listener will pick it up
                      const winnerBeforeBalance = await accounts[1].getBalance()
                      const tx = await raffle.performUpkeep("0x")
                      const txRecepit = await tx.wait(1)
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txRecepit.events[1].args.requestId,
                          raffle.address
                      )
                  })
              })
              //   it("resets the lottery", async function () {})
              //   it("sends money", async function () {})
          })
      })
