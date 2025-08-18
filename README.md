# Smart Contract Lottery

A decentralized lottery smart contract built with Foundry that allows users to enter by paying an entrance fee, uses Chainlink VRF for provably random winner selection, and automatically distributes the prize pool to the winner.

**Status:** Educational/demo implementation. Not audited. Use at your own risk.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [Local Development](#local-development)
  - [Testing](#testing)
  - [Deployment](#deployment)
- [Smart Contract API](#smart-contract-api)
- [Configuration](#configuration)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

This project implements a transparent, decentralized lottery system on Ethereum where:

- Players enter the lottery by paying a fixed entrance fee
- The contract automatically collects all entrance fees into a prize pool
- After a specified time interval, the lottery automatically picks a winner using Chainlink VRF (Verifiable Random Function)
- The entire prize pool is transferred to the winner
- A new lottery round can then begin

The lottery uses **Chainlink VRF v2** for cryptographically secure randomness, ensuring fair and verifiable winner selection.

## Features

- **🎲 Provably Fair Randomness**: Uses Chainlink VRF for tamper-proof random number generation
- **⏰ Automated Execution**: Time-based lottery rounds with automatic winner selection
- **💰 Transparent Prize Pool**: All entrance fees go directly to the winner
- **🔒 Secure Access Control**: Owner-only functions for lottery management
- **⛽ Gas Optimized**: Efficient contract design with minimal gas consumption
- **🧪 Comprehensive Testing**: Full test suite with edge case coverage
- **📊 Event Logging**: Detailed events for off-chain monitoring and analytics

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Players       │───▶│  Lottery Contract │◀───│ Chainlink VRF   │
│                 │    │                  │    │   Coordinator   │
│ - Enter lottery │    │ - Collect fees   │    │                 │
│ - Pay entrance  │    │ - Request random │    │ - Generate      │
│   fee           │    │ - Select winner  │    │   random number │
│                 │    │ - Transfer prize │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Components

1. **Lottery Contract**: Main contract managing player entries and prize distribution
2. **Chainlink VRF Integration**: Handles secure random number generation
3. **State Management**: Tracks lottery state (OPEN, CALCULATING, CLOSED)
4. **Access Control**: Owner-only administrative functions

## Prerequisites

- **Node.js** 18+ and npm
- **Foundry** toolkit installed
- **Git** for version control

### Install Foundry

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify installation
forge --version
cast --version
anvil --version
```

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TemiW3/foundry-smart-contract-lottery.git
   cd foundry-smart-contract-lottery
   ```

2. **Install dependencies**
   ```bash
   forge install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Usage

### Local Development

1. **Compile the contracts**
   ```bash
   forge build
   ```

2. **Start local blockchain**
   ```bash
   # Terminal 1: Start Anvil local node
   anvil
   ```

3. **Deploy to local network**
   ```bash
   # Terminal 2: Deploy contracts
   forge script script/DeployLottery.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
   ```

### Testing

Run the comprehensive test suite:

```bash
# Run all tests
forge test

# Run tests with verbosity
forge test -vvv

# Run specific test file
forge test --match-path test/LotteryTest.t.sol

# Run with gas reporting
forge test --gas-report

# Generate test coverage report
forge coverage
```

### Deployment

#### Sepolia Testnet

1. **Configure environment**
   ```bash
   # In .env file
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   PRIVATE_KEY=your_private_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key
   VRF_COORDINATOR=0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
   LINK_TOKEN=0x779877A7B0D9E8603169DdbD7836e478b4624789
   KEY_HASH=0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c
   ```

2. **Deploy to Sepolia**
   ```bash
   forge script script/DeployLottery.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
   ```

#### Mainnet

⚠️ **Warning**: Ensure thorough testing and security audits before mainnet deployment.

```bash
forge script script/DeployLottery.s.sol --rpc-url $MAINNET_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

## Smart Contract API

### State Variables

```solidity
uint256 private immutable i_entranceFee;        // Entry fee in wei
address payable[] private s_players;            // Array of entered players
address private s_recentWinner;                 // Last lottery winner
LotteryState private s_lotteryState;            // Current lottery state
uint256 private s_lastTimeStamp;               // Last lottery timestamp
```

### Core Functions

#### `enterLottery()` 
- **Access**: Public
- **Payable**: Yes (requires entrance fee)
- **Description**: Allows players to enter the lottery by paying the entrance fee
- **Requirements**: 
  - Lottery must be in OPEN state
  - Must send exactly the entrance fee amount

```solidity
function enterLottery() public payable {
    if (msg.value != i_entranceFee) revert Lottery__NotEnoughETHEntered();
    if (s_lotteryState != LotteryState.OPEN) revert Lottery__LotteryNotOpen();
    s_players.push(payable(msg.sender));
    emit LotteryEnter(msg.sender);
}
```

#### `performUpkeep()` 
- **Access**: Chainlink Automation
- **Description**: Initiates the winner selection process using Chainlink VRF
- **Requirements**: Automatically called when upkeep conditions are met

#### `fulfillRandomWords()` 
- **Access**: Chainlink VRF Coordinator only
- **Description**: Callback function that receives random number and selects winner
- **Automated**: Called by Chainlink VRF after random number generation

### View Functions

```solidity
function getEntranceFee() public view returns (uint256)
function getPlayer(uint256 index) public view returns (address)
function getRecentWinner() public view returns (address)
function getLotteryState() public view returns (LotteryState)
function getNumWords() public pure returns (uint256)
function getNumberOfPlayers() public view returns (uint256)
function getLastTimeStamp() public view returns (uint256)
function getInterval() public view returns (uint256)
```

### Events

```solidity
event LotteryEnter(address indexed player);
event RequestedLotteryWinner(uint256 indexed requestId);
event WinnerPicked(address indexed winner);
```

### Custom Errors

```solidity
error Lottery__NotEnoughETHEntered();
error Lottery__TransferFailed();
error Lottery__LotteryNotOpen();
error Lottery__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 lotteryState);
```

## Configuration

### Constructor Parameters

The lottery contract requires these parameters during deployment:

```solidity
constructor(
    address vrfCoordinatorV2,    // Chainlink VRF Coordinator address
    uint256 entranceFee,         // Entry fee in wei (e.g., 0.01 ETH = 10000000000000000)
    bytes32 gasLane,             // Chainlink VRF gas lane (key hash)
    uint64 subscriptionId,       // Chainlink VRF subscription ID
    uint32 callbackGasLimit,     // Gas limit for VRF callback (e.g., 500000)
    uint256 interval             // Time between lottery rounds in seconds
)
```

### Network Configurations

#### Sepolia Testnet
```solidity
VRF_COORDINATOR = 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
LINK_TOKEN = 0x779877A7B0D9E8603169DdbD7836e478b4624789
KEY_HASH = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c
```

#### Ethereum Mainnet
```solidity
VRF_COORDINATOR = 0x271682DEB8C4E0901D1a1550aD2e64D568E69909
LINK_TOKEN = 0x514910771AF9Ca656af840dff83E8264EcF986CA
KEY_HASH = 0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef
```

## Security Considerations

This implementation includes several security best practices:

### ✅ **Implemented Protections**
- **State Management**: Prevents entries during winner calculation
- **Access Control**: Critical functions restricted to appropriate callers
- **Custom Errors**: Gas-efficient error handling with descriptive messages
- **Event Logging**: Comprehensive event emission for transparency
- **Reentrancy Protection**: State changes before external calls
- **Input Validation**: Proper validation of entrance fees and contract state

### ⚠️ **Known Limitations**
- **Single Round**: Contract handles one lottery round at a time
- **Fixed Parameters**: Entrance fee and interval set at deployment
- **No Pause Mechanism**: Cannot pause lottery once deployed
- **Winner Selection**: Uses simple modulo operation (sufficient for current use case)

### 🔍 **Recommended Audits**
Before production deployment, consider auditing:
- Chainlink VRF integration patterns
- Prize distribution logic
- Edge cases with zero players
- Gas optimization opportunities
- Upgrade mechanisms (if desired)

## Troubleshooting

### Common Issues

#### **"Lottery__UpkeepNotNeeded" Error**
**Cause**: Chainlink Automation conditions not met
**Solutions**:
- Ensure lottery has players: `getNumberOfPlayers() > 0`
- Check lottery state: `getLotteryState() == OPEN`
- Verify time elapsed: `block.timestamp - getLastTimeStamp() > getInterval()`
- Confirm contract balance: `address(this).balance > 0`

#### **"Lottery__NotEnoughETHEntered" Error**
**Cause**: Incorrect entrance fee sent
**Solution**: Send exactly the entrance fee amount:
```bash
cast send $LOTTERY_CONTRACT "enterLottery()" --value 0.01ether --private-key $PRIVATE_KEY
```

#### **VRF Request Fails**
**Cause**: Insufficient LINK tokens or incorrect subscription
**Solutions**:
- Fund your Chainlink VRF subscription with LINK tokens
- Verify subscription ID matches deployment configuration
- Check gas limit is sufficient (recommended: 500,000)

#### **Deployment Issues**
**Cause**: Network configuration or insufficient funds
**Solutions**:
- Verify RPC URL is correct and accessible
- Ensure deployer account has sufficient ETH for gas
- Check constructor parameters match target network

### Testing Locally

```bash
# Start fresh Anvil instance
anvil

# Deploy with local configuration
forge script script/DeployLottery.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# Enter lottery as player
cast send <LOTTERY_ADDRESS> "enterLottery()" --value 0.01ether --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Check player count
cast call <LOTTERY_ADDRESS> "getNumberOfPlayers()"
```

## Scripts

Useful Foundry commands for development:

```bash
# Build contracts
forge build

# Run tests with different verbosity levels
forge test                    # Basic test run
forge test -vv               # Show logs for failing tests  
forge test -vvv              # Show logs for all tests
forge test -vvvv             # Show traces for failing tests
forge test -vvvvv            # Show traces for all tests

# Generate gas report
forge test --gas-report

# Check test coverage
forge coverage

# Format code
forge fmt

# Generate documentation
forge doc

# Verify contract on Etherscan
forge verify-contract <CONTRACT_ADDRESS> src/Lottery.sol:Lottery --chain-id 11155111 --etherscan-api-key $ETHERSCAN_API_KEY
```

## Repository Structure

```
foundry-smart-contract-lottery/
├── src/
│   ├── Lottery.sol              # Main lottery contract
│   └── interfaces/              # External interfaces
├── test/
│   ├── unit/
│   │   └── LotteryTest.t.sol    # Unit tests
│   └── integration/
│       └── InteractionTest.t.sol # Integration tests
├── script/
│   ├── DeployLottery.s.sol      # Deployment script
│   ├── Interactions.s.sol       # Interaction helpers
│   └── HelperConfig.s.sol       # Network configurations
├── lib/                         # Forge dependencies
├── .env.example                 # Environment template
├── foundry.toml                 # Foundry configuration
└── README.md                    # This file
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# RPC URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# Private key (never commit this!)
PRIVATE_KEY=your_private_key_here

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key

# Chainlink VRF Configuration (Sepolia)
VRF_COORDINATOR=0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
LINK_TOKEN=0x779877A7B0D9E8603169DdbD7836e478b4624789
KEY_HASH=0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c

# Lottery Parameters
ENTRANCE_FEE=10000000000000000  # 0.01 ETH in wei
CALLBACK_GAS_LIMIT=500000       # Gas limit for VRF callback
LOTTERY_INTERVAL=300            # 5 minutes in seconds
```

### Foundry Configuration

The `foundry.toml` file contains project-specific settings:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.19"
optimizer = true
optimizer_runs = 200
via_ir = false

[profile.ci]
fuzz = { runs = 10_000 }
invariant = { runs = 1_000 }

[fmt]
bracket_spacing = true
int_types = "long"
line_length = 120
multiline_func_header = "all"
number_underscore = "thousands"
quote_style = "double"
tab_width = 4
wrap_comments = true

[fuzz]
runs = 1000
max_test_rejects = 65536
seed = '0x3e8'
dictionary_weight = 40
include_storage = true
include_push_bytes = true
```

## TypeScript Integration Example

Here's how you might interact with the contract from a frontend:

```typescript
import { ethers } from 'ethers';
import LotteryABI from './artifacts/Lottery.sol/Lottery.json';

// Contract setup
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const lottery = new ethers.Contract(LOTTERY_ADDRESS, LotteryABI.abi, signer);

// Enter lottery
async function enterLottery() {
  const entranceFee = await lottery.getEntranceFee();
  const tx = await lottery.enterLottery({ value: entranceFee });
  await tx.wait();
}

// Get lottery info
async function getLotteryInfo() {
  const [
    entranceFee,
    numPlayers,
    recentWinner,
    lotteryState
  ] = await Promise.all([
    lottery.getEntranceFee(),
    lottery.getNumberOfPlayers(),
    lottery.getRecentWinner(),
    lottery.getLotteryState()
  ]);
  
  return { entranceFee, numPlayers, recentWinner, lotteryState };
}

// Listen for winner selection
lottery.on('WinnerPicked', (winner) => {
  console.log(`Winner selected: ${winner}`);
});
```

## Gas Optimization Notes

This contract implements several gas optimization techniques:

- **Packed Structs**: Efficient storage layout
- **Custom Errors**: More gas-efficient than require strings
- **Immutable Variables**: Reduced SLOAD operations for constants
- **Event Indexing**: Strategic use of indexed parameters
- **Batch Operations**: Minimizing external calls

Typical gas costs:
- **Enter Lottery**: ~50,000 gas
- **Request Random Winner**: ~100,000 gas  
- **Fulfill Random Words**: ~80,000 gas

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`forge test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines

- Follow the existing code style and formatting
- Add comprehensive tests for new features
- Update documentation for any API changes
- Use custom errors instead of require strings
- Include detailed commit messages

## Acknowledgments

- **Foundry**: Blazing fast Ethereum development framework
- **Chainlink**: Decentralized oracle network for secure randomness
- **OpenZeppelin**: Smart contract security standards and utilities
- **Patrick Collins**: Educational resources and best practices

## Contact

Built by **Temi W** - QA Engineer transitioning to Web3 Developer

- GitHub: [@TemiW3](https://github.com/TemiW3)
- Twitter: [@mr_temiw](https://x.com/mr_temiw)

---

⚠️ **Disclaimer**: This code is for educational purposes and has not been professionally audited. Do not use in production without thorough security review and testing. The developer assumes no responsibility for any losses incurred through the use of this code.
