#!/bin/bash

# TicketNFT Platform Deployment Script

set -e

echo "🎫 TicketNFT Platform Deployment"
echo "================================"

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install Solana CLI first."
    exit 1
fi

# Check if Anchor CLI is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install Anchor CLI first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

echo "✅ All prerequisites found"

# Get current Solana configuration
CURRENT_URL=$(solana config get | grep "RPC URL" | awk '{print $3}')
WALLET_PATH=$(solana config get | grep "Keypair Path" | awk '{print $3}')

echo "📍 Current Solana Configuration:"
echo "   RPC URL: $CURRENT_URL"
echo "   Wallet: $WALLET_PATH"

# Check wallet balance
BALANCE=$(solana balance --lamports 2>/dev/null || echo "0")
echo "💰 Wallet Balance: $(echo "scale=4; $BALANCE / 1000000000" | bc -l) SOL"

if [ "$BALANCE" -lt 1000000000 ]; then
    echo "⚠️  Low balance detected. You may need more SOL for deployment."
    if [[ "$CURRENT_URL" == *"devnet"* ]]; then
        echo "🪂 Requesting airdrop for devnet..."
        solana airdrop 2 || echo "❌ Airdrop failed"
    fi
fi

# Build the program
echo "🔨 Building Solana program..."
anchor build

# Deploy the program
echo "🚀 Deploying Solana program..."
anchor deploy

# Get the deployed program ID
PROGRAM_ID=$(solana address -k target/deploy/ticket_nft-keypair.json)
echo "📋 Program deployed at: $PROGRAM_ID"

# Update program ID in frontend if different
echo "🔄 Updating program ID in frontend..."
sed -i.bak "s/HKvKkTgKzGz8FNVX2VjKcgQbNhZyJm8aJQ8x4rWZpump/$PROGRAM_ID/g" app/src/contexts/ProgramProvider.tsx

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd app && npm install

# Build frontend
echo "🏗️  Building frontend..."
npm run build

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo "Program ID: $PROGRAM_ID"
echo "Network: $CURRENT_URL"
echo ""
echo "Next steps:"
echo "1. Start the frontend: cd app && npm start"
echo "2. Connect your wallet and create events"
echo "3. Share your platform with users!"
echo ""
echo "Frontend build available in: app/build/"