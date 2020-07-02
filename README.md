# Multi Vesting Contract

### Introduction
The Alliance Smart Contract is an Ethereum Smart Contract which will be holding PMA tokens. The tokens will be locked for multiple wallet addresses for a period of 25 months, and a percentage of the tokens allocated to each wallet address will be released on a monthly basis. 

The monthly percentages that is unlocked is 4% of the total amount of tokens allocated to each wallet address.

### Constants
- Unlock interval 30 days
- Unlock percentage of 4%

### Contract Deployment
PMA token address that should be specified at the deployment time 

### Smart Contract Actors

## Owner
- The owner of the smart contract is the wallet address that deploys the smart contract.
- The owner is able to allocate tokens to the beneficiaries. The allocation implies that the token balance of the smart contract suffices for that allocation.
    - For example, the balance of the smart contract is 100,000 PMA; the maximum amount that can be allocated is 100,000 PMA tokens.
- The token allocation locks the tokens and makes them redeemable only from the beneficiary according to the unlock percentage and interval, i.e., 4% per month for 25 months.
- Any un-allocated tokens can be withdrawn by the smart contract owner.
- The owner can add multiple allocations to a beneficiary. Each time a new allocation is added, the 25 months duration for the new allocation will be applied.
    - For example, an allocation to Beneficiary A of 100,000 PMA takes place on the 1st of Jun 2020. That allocation has its own unlock timeline of 4% per month over a duration of 25 months. If another allocation for the same beneficiary A of 200,000 PMA takes place on the 1st of Sept 2020, that allocation has its own unlock timeline of 4% per month over a duration of 25 months. 

## Beneficiaries
- Beneficiaries on the smart contract are wallet addresses that have tokens locked on the smart contract that can be withdrawn by them.
- Beneficiaries will only be able to withdraw the unlocked tokens allocated their address from the smart contract.
- After each unlocks period, the 4% will be unlocked for each allocation, and the beneficiary will be able to withdraw all the tokens that are unlocked until that point in time.
    - Following the above example, assume that the Beneficiary A has executed the withdrawals of July, Aug, and Sept. The beneficiary will be able to withdraw 12,000 PMA tokens for Oct. 
  (4% * 100,000) + (4% * 200,000) = 12,000 PMA token  

### How to use

- The smart contract should be topped up with tokens, which is a simple token transfer to the smart contract by any wallet address.
- The owner of the smart contract will then be able to allocate tokens to any of the beneficiaries, with the restriction that the allocation should be limited to the amount of tokens held by the smart contract.
    - To start vesting owner can call `addVestingFromNow(address user, uint256 amount)` method.
    - It's also possible to start westing from some date in the future by calling `address user, uint256 amount, uint256 startedAt`
    - In case owner add vesting several times for the same beneficiary the smart contract will keep track on this separate allocations using `vestingId` (per beneficiary)

- When an allocation takes place, the amount of tokens specified on the allocation will be locked on the smart contract and can be redeemed by the beneficiary only. The tokens will be unlocked at a rate of 4% per month for a period of 25 months.
    - User e.g `beneficiary` can check how many tokens is available for him now by calling `getAvailableAmountAggregated()`    
    - This method will give result amount aggregated from all registered `vestingIds` that beneficiary have
- The contract `owner` can add multiple allocations for a beneficiary and each allocation will follow the unlock scheme of 4% per month for a period of 25 months.
    - In that case, `vestingId` will be incremented separately for each `beneficiary`. 
- After each unlocks interval, 4% of the total amount of tokens will be available for each allocation, and the beneficiary will be able to withdraw. 
    - `Beneficiary` can check how much funds are available for withdrawing by calling `"getAvailableAmountAggregated(address user)"` 
    - To get available on specific `vestingId` beneficiary can call `getAvailableAmount(address user, uint256 vestingId)`. 
    - To withdraw released funds beneficiary needs to call `withdrawAllAvailable()` 
    - To withdraw released funds on specific `vestingId` `withdraw(uint256 vestingId)` method with target method with target `vestingId` as a parameter
    - To know how many different wares ever open to `beneficiary` anyone can call `getNextVestingId(address user)`.
- Any un-allocated tokens can be withdrawn *by* the smart contract *owner*.
    - `getUnallocatedFundsAmount()`
    - `withdrawUnallocatedFunds()`  

### Audit
- You can find audit reports in `/audit` folder 

### Development
Install global:
```
truffle
ganache-cli
solcjs
```
For me `ganache-cli` works only with `Node.js v10`

Build:
```
npm install
npm run dist
```
Run & debug:
```
ganache-cli --fork http://34.70.221.143:8545 -p 9545 --gasLimit 0xfffffffffff -m "sport pattern badge pretty abandon venture stone cupboard plunge firm bulk essence"
remixd -s . --remix-ide "https://remix.ethereum.org"
```
Then open https://remix.ethereum.org/ and connect `remixd` plugin.
 
- Compile `MultiVesting.full.sol` contract.

- On `DEPLOY & RUN TRANSACTIONS` tab in remix set `ENVIRONMENT` to `Web3 Provider`.
Use Ganache endpoint to connect(`http://localhost:9545`)

- Chose `MultiVesting` contract for deployment, specify `PMA` contract address in the constructor params: 0x846c66cf71c43f80403b51fe3906b3599d63336f
- You can deploy `IERC20` contract using `At address` feature. Specify `0x846c66cf71c43f80403b51fe3906b3599d63336f`
- Use accounts generated by ganache to top-up `MultiVesting` contract;

Testing:
    - Tests is located in `test` folder
    - Use `npm test` to launch it 

