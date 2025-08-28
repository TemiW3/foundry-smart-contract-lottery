# Smart Contract Interaction Guide

## Overview
When you have deployed a smart contract to Sepolia but only have the bytecode (no source code), here are the methods to discover and interact with its functions.

## Method 1: Bytecode Analysis (Recommended)

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Analyze Your Bytecode
```bash
python bytecode_analyzer.py "YOUR_BYTECODE_HERE"
```

This will:
- Extract function selectors from the bytecode
- Identify common functions (ERC20, ERC721, etc.)
- Generate an interaction template

### Step 3: Use the Generated Template
The script creates `contract_interaction_template.js` with:
- Partial ABI for identified functions
- Example interaction code
- Connection setup for Sepolia

## Method 2: Etherscan Verification Check

### Check if Contract is Verified
1. Go to [Sepolia Etherscan](https://sepolia.etherscan.io/)
2. Search for your contract address
3. If verified, you can:
   - View the full ABI
   - See all functions and their parameters
   - Use the "Read Contract" and "Write Contract" tabs

### Get ABI from Verified Contract
```javascript
// If verified, you can copy the ABI directly from Etherscan
const abi = [
  // Paste the full ABI here
];

const contract = new ethers.Contract(contractAddress, abi, signer);
```

## Method 3: Transaction History Analysis

### Analyze Past Transactions
1. Look at the contract's transaction history on Etherscan
2. Examine successful transactions to understand:
   - Which functions are being called
   - What parameters they accept
   - Return values (for view functions)

### Example: Analyzing a Transfer Transaction
```javascript
// If you see a transfer transaction, you can infer:
const transferData = "0xa9059cbb000000000000000000000000...";
// First 4 bytes: 0xa9059cbb = transfer(address,uint256)
```

## Method 4: 4byte.directory Lookup

### Search for Unknown Function Selectors
1. Take the first 4 bytes of any unknown function call
2. Search on [4byte.directory](https://www.4byte.directory/)
3. This database contains known function signatures

### Example
```bash
# If you see: 0x23b872dd in your bytecode
# Search on 4byte.directory for: 23b872dd
# Result: transferFrom(address,address,uint256)
```

## Method 5: Common Function Patterns

### ERC20 Token Functions
```javascript
const erc20Functions = {
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0x70a08231': 'balanceOf(address)',
  '0x18160ddd': 'totalSupply()',
  '0x95d89b41': 'symbol()',
  '0x06fdde03': 'name()'
};
```

### ERC721 NFT Functions
```javascript
const erc721Functions = {
  '0x6352211e': 'ownerOf(uint256)',
  '0x42842e0e': 'safeTransferFrom(address,address,uint256)',
  '0xa22cb465': 'setApprovalForAll(address,bool)',
  '0xe985e9c5': 'isApprovedForAll(address,address)'
};
```

## Practical Example: Interacting with Your Contract

### Setup
```javascript
const { ethers } = require('ethers');

// Connect to Sepolia
const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_PROJECT_ID');
const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);

// Your contract address
const contractAddress = '0x...'; // Replace with your address
```

### Minimal ABI for Common Functions
```javascript
const minimalABI = [
  // ERC20 functions
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "_to", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  }
];

const contract = new ethers.Contract(contractAddress, minimalABI, wallet);
```

### Read Functions (No Gas Required)
```javascript
async function readContract() {
  try {
    // Get total supply
    const totalSupply = await contract.totalSupply();
    console.log('Total Supply:', totalSupply.toString());
    
    // Get balance of specific address
    const balance = await contract.balanceOf('0x...');
    console.log('Balance:', balance.toString());
    
  } catch (error) {
    console.error('Error reading contract:', error);
  }
}
```

### Write Functions (Requires Gas)
```javascript
async function writeContract() {
  try {
    // Transfer tokens
    const tx = await contract.transfer('0x...', ethers.utils.parseEther('1.0'));
    console.log('Transaction hash:', tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);
    
  } catch (error) {
    console.error('Error writing to contract:', error);
  }
}
```

## Testing Your Functions

### 1. Start with Read Functions
Always test read functions first as they don't cost gas:
```javascript
// Test basic info
const name = await contract.name();
const symbol = await contract.symbol();
const decimals = await contract.decimals();
```

### 2. Test with Small Amounts
When testing write functions, use small amounts first:
```javascript
// Test with minimal amount
const tx = await contract.transfer('0x...', ethers.utils.parseEther('0.001'));
```

### 3. Use Sepolia Testnet
Since you're on Sepolia, you can:
- Get free test ETH from faucets
- Test without real costs
- Debug easily

## Troubleshooting

### Common Issues

1. **"Function not found"**
   - Check if the function selector exists in your bytecode
   - Verify the ABI matches the actual contract

2. **"Insufficient gas"**
   - Increase gas limit
   - Check if you have enough Sepolia ETH

3. **"Invalid parameters"**
   - Verify parameter types and order
   - Check if parameters are in the correct format

### Debug Tips

1. **Use Ethers.js debugging**
```javascript
const tx = await contract.transfer('0x...', amount, {
  gasLimit: 100000,
  gasPrice: ethers.utils.parseUnits('20', 'gwei')
});
```

2. **Check transaction status**
```javascript
const receipt = await tx.wait();
console.log('Gas used:', receipt.gasUsed.toString());
```

3. **Use try-catch for error handling**
```javascript
try {
  const result = await contract.someFunction();
} catch (error) {
  console.error('Function call failed:', error.message);
}
```

## Next Steps

1. **Run the bytecode analyzer** on your contract
2. **Check if your contract is verified** on Etherscan
3. **Start with read functions** to understand the contract
4. **Test write functions** with small amounts
5. **Build your interaction interface** based on discovered functions

Remember: Always test thoroughly on Sepolia before moving to mainnet!