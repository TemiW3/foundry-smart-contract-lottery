const { ethers } = require('ethers');

// Configuration
const CONTRACT_ADDRESS = '0x...'; // Replace with your contract address
const INFURA_PROJECT_ID = 'YOUR_INFURA_PROJECT_ID'; // Replace with your Infura project ID
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY'; // Replace with your private key

// Connect to Sepolia
const provider = new ethers.providers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Minimal ABI for common functions
// This is a starting point - you'll need to expand based on your contract
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
    },
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    }
];

// Create contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, minimalABI, wallet);

async function getContractInfo() {
    try {
        console.log('🔍 Getting contract information...');
        
        // Get basic token info
        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        const totalSupply = await contract.totalSupply();
        
        console.log('📋 Contract Information:');
        console.log(`Name: ${name}`);
        console.log(`Symbol: ${symbol}`);
        console.log(`Decimals: ${decimals}`);
        console.log(`Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)} ${symbol}`);
        
        // Get balance of connected wallet
        const balance = await contract.balanceOf(wallet.address);
        console.log(`Your Balance: ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`);
        
    } catch (error) {
        console.error('❌ Error getting contract info:', error.message);
        
        // If basic functions fail, try to get bytecode
        console.log('\n🔧 Trying to get contract bytecode...');
        try {
            const bytecode = await provider.getCode(CONTRACT_ADDRESS);
            console.log(`Contract has bytecode: ${bytecode.length > 2 ? 'Yes' : 'No'}`);
            if (bytecode.length > 2) {
                console.log('💡 Run the bytecode analyzer to discover available functions:');
                console.log(`python bytecode_analyzer.py "${bytecode}"`);
            }
        } catch (bytecodeError) {
            console.error('❌ Error getting bytecode:', bytecodeError.message);
        }
    }
}

async function transferTokens(toAddress, amount) {
    try {
        console.log(`💰 Transferring ${amount} tokens to ${toAddress}...`);
        
        // Parse amount based on decimals
        const decimals = await contract.decimals();
        const parsedAmount = ethers.utils.parseUnits(amount, decimals);
        
        // Estimate gas
        const gasEstimate = await contract.estimateGas.transfer(toAddress, parsedAmount);
        console.log(`Estimated gas: ${gasEstimate.toString()}`);
        
        // Send transaction
        const tx = await contract.transfer(toAddress, parsedAmount, {
            gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
        });
        
        console.log(`📤 Transaction sent: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        
    } catch (error) {
        console.error('❌ Error transferring tokens:', error.message);
    }
}

async function checkAllowance(owner, spender) {
    try {
        // Add allowance function to ABI if not present
        const allowanceABI = {
            "constant": true,
            "inputs": [
                {"name": "_owner", "type": "address"},
                {"name": "_spender", "type": "address"}
            ],
            "name": "allowance",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        };
        
        const contractWithAllowance = new ethers.Contract(CONTRACT_ADDRESS, [...minimalABI, allowanceABI], wallet);
        const allowance = await contractWithAllowance.allowance(owner, spender);
        const decimals = await contract.decimals();
        const symbol = await contract.symbol();
        
        console.log(`📊 Allowance: ${ethers.utils.formatUnits(allowance, decimals)} ${symbol}`);
        
    } catch (error) {
        console.error('❌ Error checking allowance:', error.message);
    }
}

// Function to test if a function exists
async function testFunction(functionName, ...args) {
    try {
        console.log(`🧪 Testing function: ${functionName}`);
        const result = await contract[functionName](...args);
        console.log(`✅ ${functionName} result:`, result.toString());
        return true;
    } catch (error) {
        console.log(`❌ Function ${functionName} not available or failed:`, error.message);
        return false;
    }
}

// Main execution
async function main() {
    console.log('🚀 Starting contract interaction...\n');
    
    // Check wallet balance
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`💰 Wallet ETH balance: ${ethers.utils.formatEther(ethBalance)} ETH`);
    
    if (ethBalance.isZero()) {
        console.log('⚠️  No ETH in wallet. Get some from Sepolia faucet:');
        console.log('   https://sepoliafaucet.com/');
        return;
    }
    
    // Get contract information
    await getContractInfo();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test common functions
    console.log('🧪 Testing common functions...');
    await testFunction('totalSupply');
    await testFunction('name');
    await testFunction('symbol');
    await testFunction('decimals');
    await testFunction('balanceOf', wallet.address);
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Example transfer (commented out for safety)
    /*
    const recipientAddress = '0x...'; // Replace with recipient address
    const transferAmount = '1.0'; // Amount to transfer
    
    console.log('💸 Transfer example (commented out for safety):');
    console.log(`To: ${recipientAddress}`);
    console.log(`Amount: ${transferAmount}`);
    console.log('Uncomment the transferTokens call below to execute');
    
    // await transferTokens(recipientAddress, transferAmount);
    */
    
    console.log('\n✅ Contract interaction complete!');
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
    process.exit(1);
});

// Run the main function
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    getContractInfo,
    transferTokens,
    checkAllowance,
    testFunction
};