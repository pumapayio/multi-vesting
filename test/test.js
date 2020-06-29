const assert = require('assert')
const {timeTravel, currentBlockTime} = require('./helpers/timeHelpers')
const w3 = require('web3')
const {toWei, fromWei, toHex, toBN} = w3.utils

const MultiVesting = artifacts.require('MultiVesting')
const MockERC20Token = artifacts.require('MockERC20Token')

const secondsInDay = 86400
const secondsIn30Days = secondsInDay * 30

contract('MultiVesting', function ([owner, user1, user2, user3, user4]) {

    describe('Owner & beneficiaries', async function () {

        beforeEach('Deploy Token and MultiVesting contracts', async function () {

            const args = ['MockERC20Token', 'TST', 18, toWei('1', 'ether')]
            this.erc20Token = await MockERC20Token.new(...args, {from: owner})

            this.multiVesting = await MultiVesting.new(
                this.erc20Token.address,
                {from: owner}
            )

            await this.erc20Token.transfer(
                this.multiVesting.address, toWei('1', 'ether'),
                {from: owner}
            )
        })

        it('Allows to add westing to owner', async function () {
            const args = [user1, toWei('1', 'ether')]
            await this.multiVesting.addVestingFromNow(...args, {from: owner})
            const x = await this.multiVesting.getNextVestingId(user1)
            assert(x.toNumber() === 1)
        })

        it('Doesn\'t allow add westing to owner with a past timestamp', async function () {
            const timestampInThePast = Math.floor(Date.now() / 1000) - 20000
            const args = [user1, toWei('1', 'ether'), timestampInThePast]
            await assert.rejects(() => {
                    return this.multiVesting.addVesting(...args, {from: owner})
                },
                {reason: 'TIMESTAMP_CANNOT_BE_IN_THE_PAST'}
            )
        })

        it('Doesn\'t allow add westing to owner that is to far from current date', async function () {
            const thirtyDays = 60 * 60 * 24 * 180;
            const timestampInThePast = Math.floor(Date.now() / 1000) + (thirtyDays + 1)
            const args = [user1, toWei('1', 'ether'), timestampInThePast]
            await assert.rejects(() => {
                    return this.multiVesting.addVesting(...args, {from: owner})
                },
                {reason: 'TIMESTAMP_CANNOT_BE_MORE_THAN_A_180_DAYS_IN_FUTURE'}
            )
        })

        it('Doesn\'t allow to other add vesting', async function () {
            await assert.rejects(() => {
                const args = [user1, toWei('1', 'ether')]
                return this.multiVesting.addVestingFromNow(
                    ...args,
                    {from: user3}
                )
            }, {reason: 'Ownable: caller is not the owner'})
        })

        it('Allows to add vesting to multiple beneficiaries', async function () {
            {
                const args = [user1, toWei('0.5', 'ether')]
                await this.multiVesting.addVestingFromNow(...args, {from: owner})
                const nextVestingId = await this.multiVesting.getNextVestingId(user1)
                assert(nextVestingId.toNumber() === 1)
            }

            {
                const args = [user2, toWei('0.5', 'ether')]
                await this.multiVesting.addVestingFromNow(...args, {from: owner})
                const nextVestingId = await this.multiVesting.getNextVestingId(user1)
                assert(nextVestingId.toNumber() === 1)
            }
        })

        it('Allows to add several vesting options to the same beneficiary', async function () {

            const args = [user1, toWei('0.5', 'ether')]
            await this.multiVesting.addVestingFromNow(...args, {from: owner})
            await this.multiVesting.addVestingFromNow(...args, {from: owner})

            const x = await this.multiVesting.getNextVestingId(user1)
            assert(x.toNumber() === 2)
        })

        it('Doesn\'t allow to add westing if balance is insufficient', async function () {

            await assert.rejects(
                () => {
                    const args = [user1, toWei('2', 'ether')]
                    return this.multiVesting.addVestingFromNow(
                        ...args,
                        {from: owner}
                    )
                },
                {reason: 'DON_T_HAVE_ENOUGH_PMA'}
            )
        })

        it('Minimal vesting should be be greater than fraction', async function () {

            await assert.rejects(() => {
                    const args = [user1, '24']
                    return this.multiVesting.addVestingFromNow(
                        ...args,
                        {from: owner}
                    )
                },
                {reason: 'VESTING_AMOUNT_TO_LOW'}
            )
        })
    })

    describe('Funds unlock tests', async function () {

        beforeEach('Deploy Token and MultiVesting contracts', async function () {

            const args = ['MockERC20Token', 'TST', 18, toWei('1', 'ether')]
            this.erc20Token = await MockERC20Token.new(...args, {from: owner})

            this.multiVesting = await MultiVesting.new(
                this.erc20Token.address,
                {from: owner}
            )

            await this.erc20Token.transfer(
                this.multiVesting.address, toWei('1', 'ether'),
                {from: owner}
            )

            {
                const args = [user1, toWei('1', 'ether')]
                await this.multiVesting.addVestingFromNow(...args, {from: owner})
            }
        })

        it('Doesn\'t allow to withdraw tokens until one month passed', async function () {
            await assert.rejects(
                this.multiVesting.withdraw('0', {from: user1}),
                {reason: 'DON_T_HAVE_RELEASED_TOKENS'}
            )
        })

        it('Allows to withdraw part of the funds after 30 days', async function () {
            await timeTravel(secondsIn30Days)
            const vestingId = '0'
            await this.multiVesting.withdraw(vestingId, {from: user1})
            const balanceBn = await this.erc20Token.balanceOf(user1)
            const balanceInEther = fromWei(balanceBn, 'milli') / 1000
            assert.strictEqual(balanceInEther, 0.04) // 4%
        })

        it('Allows to withdraw part of the funds after 60 days', async function () {
            await timeTravel(secondsIn30Days * 2)
            const vestingId = '0'
            await this.multiVesting.withdraw(vestingId, {from: user1})
            const balanceBn = await this.erc20Token.balanceOf(user1)
            const balanceInEther = fromWei(balanceBn, 'milli') / 1000
            assert.strictEqual(balanceInEther, 0.08) // 8%
        })

        it('Allows to withdraw all the vested funds after 30*25 days', async function () {
            await timeTravel(secondsIn30Days * 25)
            const vestingId = '0'
            await this.multiVesting.withdraw(vestingId, {from: user1})
            const balanceBn = await this.erc20Token.balanceOf(user1)
            const balanceInEther = fromWei(balanceBn, 'milli') / 1000
            assert.strictEqual(balanceInEther, 1) // 100%
        })

        it('Call of withdraw transfers correct amount of funds after 30*30 month', async function () {
            await timeTravel(secondsIn30Days * 30)
            const vestingId = '0'
            await this.multiVesting.withdraw(vestingId, {from: user1})
            const balanceBn = await this.erc20Token.balanceOf(user1)
            const balanceInEther = fromWei(balanceBn, 'milli') / 1000
            assert.strictEqual(balanceInEther, 1) // 100% and no more
        })

        it('Beneficiary receives correct amount of tokens when he call withdraw several time', async function () {

            const vestingId = '0'

            // Withdraw after one month
            await timeTravel(secondsIn30Days)
            await this.multiVesting.withdraw(vestingId, {from: user1})
            {
                const balanceBn = await this.erc20Token.balanceOf(user1)
                const balanceInEther = fromWei(balanceBn, 'milli') / 1000
                assert.strictEqual(balanceInEther, 0.04) // 4%
            }

            // Withdraw after four month
            await timeTravel((secondsIn30Days * 3) + 1)
            await this.multiVesting.withdraw(vestingId, {from: user1})
            {
                const balanceBn = await this.erc20Token.balanceOf(user1)
                const balanceInEther = fromWei(balanceBn, 'milli') / 1000
                assert.strictEqual(balanceInEther, 0.16, '') // 4 + 12 = 16%
            }
        })

        it('Returns 0 for allocation available for the beneficiaries who doesn\'t have vesting', async function () {
            const balanceBn = await this.multiVesting.getAvailableAmountAggregated(user4, {from: user4})
            const balanceInEther = fromWei(balanceBn, 'milli') / 1000
            assert.strictEqual(balanceInEther, 0) // 100% and no more
        })

        it('Returns 0 for allocation available for the beneficiaries who doesn\'t have vesting, when vesingId is specified explicitly', async function () {
            const balanceBn = await this.multiVesting.getAvailableAmount(user4, '0', {from: user4})
            const balanceInEther = fromWei(balanceBn, 'milli') / 1000
            assert.strictEqual(balanceInEther, 0) // 100% and no more
        })

    })


    describe('Withdraw', async function () {

        beforeEach('Deploy Token and MultiVesting contracts', async function () {

            const args = ['MockERC20Token', 'TST', 18, toWei('1', 'ether')]
            this.erc20Token = await MockERC20Token.new(...args, {from: owner})

            this.multiVesting = await MultiVesting.new(
                this.erc20Token.address,
                {from: owner}
            )

            await this.erc20Token.transfer(
                this.multiVesting.address, toWei('1', 'ether'),
                {from: owner}
            )

            // 0.3 ether to user1
            {
                const args = [user1, toWei('0.3', 'ether')]
                await this.multiVesting.addVestingFromNow(...args, {from: owner})
            }

            // 0.3 ether to user2
            {
                const args = [user2, toWei('0.3', 'ether')]
                await this.multiVesting.addVestingFromNow(...args, {from: owner})
            }

            // 0.3 ether to user3
            {
                const args = [user3, toWei('0.3', 'ether')]
                await this.multiVesting.addVestingFromNow(...args, {from: owner})
            }
        })

        it('Allows withdraw unallocated funds to owner', async function () {
            {
                const balanceBn = await this.erc20Token.balanceOf(user4)
                const balanceInEther = fromWei(balanceBn, 'milli') / 1000
                assert.strictEqual(balanceInEther, 0, 'Initial balance is 0')
            }

            await this.multiVesting.withdrawUnallocatedFunds(user4, {from: owner})
            const balanceBn = await this.erc20Token.balanceOf(user4)
            const balanceInEther = fromWei(balanceBn, 'milli') / 1000
            assert.strictEqual(balanceInEther, 0.1, 'Expect to withdraw 0.1 of unallocated funds')
        })

        it('Doesn\'t allow withdraw unallocated funds to anyone else', async function () {
            await assert.rejects(
                this.multiVesting.withdrawUnallocatedFunds(user4, {from: user4}),
                {reason: 'Ownable: caller is not the owner'}
            )
        })

        it('Doesn\'t allow to withdraw in case all funds are allocated', async function () {
            // Allocate 0.1 more to user3, so all funds are distributed
            const args = [user3, toWei('0.1', 'ether')]
            await this.multiVesting.addVestingFromNow(...args, {from: owner})

            await assert.rejects(
                this.multiVesting.withdrawUnallocatedFunds(user4, {from: owner}),
                {reason: 'DON_T_HAVE_UNALLOCATED_TOKENS',}
            )
        })
    })


    describe('Test function that iterate over vesting Ids', async function () {
        beforeEach('Deploy Token and MultiVesting contracts', async function () {

            const erc20args = ['MockERC20Token', 'TST', 18, toWei('1', 'ether')]
            this.erc20Token = await MockERC20Token.new(...erc20args, {from: owner})

            this.multiVesting = await MultiVesting.new(
                this.erc20Token.address,
                {from: owner}
            )

            await this.erc20Token.transfer(
                this.multiVesting.address, toWei('1', 'ether'),
                {from: owner}
            )

            const vestingArgs = [user1, toWei('0.3', 'ether')]
            await this.multiVesting.addVestingFromNow(...vestingArgs, {from: owner})
            await this.multiVesting.addVestingFromNow(...vestingArgs, {from: owner})
            await this.multiVesting.addVestingFromNow(...vestingArgs, {from: owner})
        })

        it('Returns correct aggregated available amount for beneficiary with several allocations', async function () {

            await timeTravel(secondsIn30Days * 25)
            //
            const total = await this.multiVesting.getAvailableAmountAggregated(user1, {from: user1})
            const balanceInEther = fromWei(total, 'milli') / 1000

            assert.strictEqual(balanceInEther, 0.9)
        })

        // Test were add to have full coverage
        it('Returns correct aggregated available amount for beneficiary with several allocations.\nAnd one of allocations was withdraw fully before the last completed', async function () {

            await timeTravel(secondsIn30Days * 25)
            {
                const total = await this.multiVesting.getAvailableAmountAggregated(user1, {from: user1})
                const balanceInEther = fromWei(total, 'milli') / 1000
                assert.strictEqual(balanceInEther, 0.9)
            }

            await this.multiVesting.withdrawAllAvailable({from: user1})

            {
                const vestingArgs = [user1, toWei('0.1', 'ether')]
                await this.multiVesting.addVestingFromNow(...vestingArgs, {from: owner})

                await timeTravel(secondsIn30Days * 25)

                const total = await this.multiVesting.getAvailableAmountAggregated(user1, {from: user1})
                const balanceInEther = fromWei(total, 'milli') / 1000
                assert.strictEqual(balanceInEther, 0.1)
            }
        })

        it('Returns 0 for beneficiary that doesn\'t have allocations', async function () {
            await timeTravel(secondsIn30Days * 25)
            const total = await this.multiVesting.getAvailableAmountAggregated(user2, {from: user2})
            assert.strictEqual(total.toNumber(), 0)
        })

        it('Allows to withdraw part of the funds from several vesting at one call', async function () {

            await timeTravel(secondsIn30Days * 10)
            {
                await this.multiVesting.withdrawAllAvailable({from: user1})
                const balanceBn = await this.erc20Token.balanceOf(user1)
                const balanceInEther = fromWei(balanceBn, 'milli') / 1000

                assert.strictEqual(balanceInEther, 0.36)
            }

            await timeTravel(secondsIn30Days * 15)
            {
                await this.multiVesting.withdrawAllAvailable({from: user1})
                const balanceBn = await this.erc20Token.balanceOf(user1)
                const balanceInEther = fromWei(balanceBn, 'milli') / 1000

                assert.strictEqual(balanceInEther, 0.9)
            }
        })

        it('Allows to withdraw all funds from several when vesting time is expired', async function () {
            await timeTravel(secondsIn30Days * 25)

            await this.multiVesting.withdrawAllAvailable({from: user1})
            const balanceBn = await this.erc20Token.balanceOf(user1)
            const balanceInEther = fromWei(balanceBn, 'milli') / 1000

            assert.strictEqual(balanceInEther, 0.9)
        })
    })
})
