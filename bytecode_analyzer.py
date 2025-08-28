#!/usr/bin/env python3
"""
Smart Contract Bytecode Analyzer
Extracts function selectors from deployed contract bytecode
"""

import re
import sys
from web3 import Web3
from eth_abi import decode_abi
import json

def extract_function_selectors(bytecode):
    """
    Extract function selectors from bytecode
    Function selectors are the first 4 bytes of the keccak256 hash of the function signature
    """
    # Remove '0x' prefix if present
    if bytecode.startswith('0x'):
        bytecode = bytecode[2:]
    
    # Look for PUSH4 instructions followed by 4 bytes (function selectors)
    # PUSH4 opcode is 0x63
    selectors = set()
    
    i = 0
    while i < len(bytecode) - 8:  # Need at least 9 bytes (1 for PUSH4 + 8 for selector)
        if bytecode[i:i+2] == '63':  # PUSH4 opcode
            selector = bytecode[i+2:i+10]  # Next 4 bytes (8 hex chars)
            if len(selector) == 8:
                selectors.add('0x' + selector)
            i += 10
        else:
            i += 2
    
    return list(selectors)

def get_common_function_signatures():
    """
    Return a dictionary of common function signatures and their selectors
    """
    common_functions = {
        # ERC20 functions
        '0xa9059cbb': 'transfer(address,uint256)',
        '0x23b872dd': 'transferFrom(address,address,uint256)',
        '0x095ea7b3': 'approve(address,uint256)',
        '0xdd62ed3e': 'allowance(address,address)',
        '0x70a08231': 'balanceOf(address)',
        '0x18160ddd': 'totalSupply()',
        '0x95d89b41': 'symbol()',
        '0x313ce567': 'decimals()',
        '0x06fdde03': 'name()',
        
        # ERC721 functions
        '0x6352211e': 'ownerOf(uint256)',
        '0x42842e0e': 'safeTransferFrom(address,address,uint256)',
        '0xb88d4fde': 'safeTransferFrom(address,address,uint256,bytes)',
        '0x23b872dd': 'transferFrom(address,address,uint256)',
        '0xa22cb465': 'setApprovalForAll(address,bool)',
        '0xe985e9c5': 'isApprovedForAll(address,address)',
        '0x6352211e': 'ownerOf(uint256)',
        
        # Common admin functions
        '0x8da5cb5b': 'owner()',
        '0xf2fde38b': 'transferOwnership(address)',
        '0x715018a6': 'renounceOwnership()',
        
        # Pausable functions
        '0x5c975abb': 'paused()',
        '0x8456cb59': 'pause()',
        '0x3f4ba83a': 'unpause()',
        
        # Access control
        '0xa217fddf': 'DEFAULT_ADMIN_ROLE()',
        '0x248a9ca3': 'getRoleAdmin(bytes32)',
        '0x36568abe': 'hasRole(bytes32,address)',
        
        # Events (not callable but useful to know)
        '0xddf252ad': 'Transfer(address,address,uint256)',
        '0x8c5be1e5': 'Approval(address,address,uint256)',
        '0x17307eab': 'ApprovalForAll(address,address,bool)',
    }
    return common_functions

def analyze_bytecode(bytecode):
    """
    Analyze bytecode and provide insights about possible functions
    """
    print("🔍 Analyzing smart contract bytecode...")
    print(f"Bytecode length: {len(bytecode)//2} bytes")
    
    # Extract function selectors
    selectors = extract_function_selectors(bytecode)
    print(f"\n📋 Found {len(selectors)} potential function selectors:")
    
    common_functions = get_common_function_signatures()
    
    identified_functions = []
    unknown_selectors = []
    
    for selector in selectors:
        if selector in common_functions:
            function_name = common_functions[selector]
            identified_functions.append((selector, function_name))
            print(f"✅ {selector}: {function_name}")
        else:
            unknown_selectors.append(selector)
            print(f"❓ {selector}: Unknown function")
    
    print(f"\n📊 Summary:")
    print(f"- Identified functions: {len(identified_functions)}")
    print(f"- Unknown selectors: {len(unknown_selectors)}")
    
    if unknown_selectors:
        print(f"\n🔧 To identify unknown functions, you can:")
        print("1. Check if the contract is verified on Etherscan")
        print("2. Look for function signatures in the source code")
        print("3. Use tools like 4byte.directory to search for known selectors")
        print("4. Analyze the contract's transaction history")
    
    return identified_functions, unknown_selectors

def create_interaction_template(contract_address, identified_functions):
    """
    Create a template for interacting with the contract
    """
    template = f"""
// Smart Contract Interaction Template
// Contract Address: {contract_address}
// Network: Sepolia

const ethers = require('ethers');

// ABI for identified functions
const abi = [
"""
    
    for selector, function_name in identified_functions:
        # Parse function signature to create ABI entry
        if '(' in function_name and ')' in function_name:
            name = function_name.split('(')[0]
            params = function_name.split('(')[1].split(')')[0]
            
            if params:
                param_list = []
                for param in params.split(','):
                    if param.strip():
                        param_list.append(param.strip())
                
                abi_entry = f'  {{\n    "type": "function",\n    "name": "{name}",\n    "inputs": ['
                if param_list:
                    abi_entry += '\n      ' + ',\n      '.join([f'{{"name": "param{i}", "type": "{param}"}}' for i, param in enumerate(param_list)])
                abi_entry += '\n    ],\n    "outputs": [],\n    "stateMutability": "nonpayable"\n  }'
            else:
                abi_entry = f'  {{\n    "type": "function",\n    "name": "{name}",\n    "inputs": [],\n    "outputs": [],\n    "stateMutability": "nonpayable"\n  }'
        else:
            abi_entry = f'  {{\n    "type": "function",\n    "name": "{function_name}",\n    "inputs": [],\n    "outputs": [],\n    "stateMutability": "nonpayable"\n  }'
        
        template += abi_entry + ',\n'
    
    template += """];

// Connect to Sepolia
const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_PROJECT_ID');
const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);

// Contract instance
const contract = new ethers.Contract('""" + contract_address + """', abi, wallet);

// Example function calls:
async function interactWithContract() {
    try {
        // Example: Get total supply (if ERC20)
        // const totalSupply = await contract.totalSupply();
        // console.log('Total Supply:', totalSupply.toString());
        
        // Example: Get balance
        // const balance = await contract.balanceOf('WALLET_ADDRESS');
        // console.log('Balance:', balance.toString());
        
    } catch (error) {
        console.error('Error:', error);
    }
}

interactWithContract();
"""
    
    return template

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python bytecode_analyzer.py <bytecode>")
        print("Example: python bytecode_analyzer.py 0x608060405234801561001057600080fd5b...")
        sys.exit(1)
    
    bytecode = sys.argv[1]
    identified_functions, unknown_selectors = analyze_bytecode(bytecode)
    
    # Create interaction template
    contract_address = "0x..."  # Replace with actual address
    template = create_interaction_template(contract_address, identified_functions)
    
    with open('contract_interaction_template.js', 'w') as f:
        f.write(template)
    
    print(f"\n📝 Created 'contract_interaction_template.js' with interaction examples")