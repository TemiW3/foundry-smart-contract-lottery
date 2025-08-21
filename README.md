# TicketNFT Platform

A full-stack decentralized ticket selling platform built on Solana where tickets are represented as NFTs. Event organizers can create events and automatically generate NFT collections for their tickets, while users can purchase tickets that are minted as unique NFTs.

## Features

### For Event Organizers
- **Create Events**: Set up events with details like name, description, location, date, and ticket pricing
- **NFT Collection Generation**: Automatically create NFT collections for each event
- **Dynamic Pricing**: Update ticket prices before sale ends
- **Revenue Management**: Receive payments directly in SOL

### For Ticket Buyers
- **Browse Events**: Discover available events with detailed information
- **Purchase Tickets**: Buy tickets that are minted as unique NFTs
- **Wallet Integration**: Connect with popular Solana wallets (Phantom, Solflare, Backpack)
- **NFT Ownership**: True ownership of tickets as verifiable NFTs

### Technical Features
- **Solana Program**: Smart contract written in Rust using Anchor framework
- **NFT Standards**: Follows Metaplex Token Metadata standards
- **Modern Frontend**: React/TypeScript with Tailwind CSS
- **Wallet Integration**: Comprehensive wallet adapter support
- **Real-time Updates**: Dynamic event and ticket status updates

## Architecture

### Smart Contract (Rust/Anchor)
- **Event Creation**: Creates events with NFT collection initialization
- **Ticket Purchasing**: Mints unique NFTs as tickets
- **Access Control**: Owner-only functions for event management
- **Payment Processing**: Direct SOL transfers to event organizers

### Frontend (React/TypeScript)
- **Responsive Design**: Modern UI with Tailwind CSS
- **Wallet Integration**: Solana wallet adapter
- **Real-time Data**: Fetches live blockchain data
- **User Experience**: Intuitive event browsing and ticket purchasing

## Project Structure

```
ticket-nft-platform/
├── programs/
│   └── ticket-nft/
│       ├── src/
│       │   └── lib.rs          # Main Solana program
│       └── Cargo.toml
├── app/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── contexts/          # React contexts (Wallet, Program)
│   │   ├── pages/             # Application pages
│   │   ├── types/             # TypeScript type definitions
│   │   ├── utils/             # Utility functions
│   │   └── idl/               # Program IDL
│   ├── public/
│   └── package.json
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Workspace configuration
└── package.json               # Build scripts
```

## Prerequisites

- **Rust** (latest stable)
- **Solana CLI** (v1.16.0 or later)
- **Anchor CLI** (v0.29.0 or later)
- **Node.js** (v16 or later)
- **npm** or **yarn**

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ticket-nft-platform
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Configure Solana CLI**
   ```bash
   solana config set --url devnet
   solana-keygen new --outfile ~/.config/solana/id.json
   solana airdrop 2
   ```

## Development

### Start Local Development

1. **Start Solana Test Validator**
   ```bash
   npm run start-localnet
   ```

2. **Build and Deploy Program**
   ```bash
   npm run build-program
   npm run deploy-program
   ```

3. **Start Frontend**
   ```bash
   npm run start-app
   ```

4. **Or run everything together**
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run build-program` - Build the Solana program
- `npm run test-program` - Run program tests
- `npm run deploy-program` - Deploy program to configured cluster
- `npm run start-localnet` - Start local Solana test validator
- `npm run start-app` - Start React development server
- `npm run build-app` - Build React app for production
- `npm run setup` - Install all dependencies and build program
- `npm run clean` - Clean build artifacts

## Usage

### Creating an Event

1. Connect your Solana wallet
2. Navigate to "Create Event"
3. Fill in event details:
   - Event name and description
   - Location and date/time
   - Sale end date/time
   - Ticket price in SOL
   - Maximum number of tickets
   - Optional event image URL
4. Submit to create the event and NFT collection

### Buying Tickets

1. Connect your Solana wallet
2. Browse available events
3. Click on an event to view details
4. Click "Buy Ticket" to purchase
5. Confirm the transaction in your wallet
6. Receive your unique ticket NFT

### Managing Events

Event organizers can:
- Update ticket prices before sale ends
- View real-time sales data
- Monitor ticket availability

## Smart Contract Details

### Program ID
- **Devnet**: `HKvKkTgKzGz8FNVX2VjKcgQbNhZyJm8aJQ8x4rWZpump`

### Key Instructions
- `create_event` - Creates a new event with NFT collection
- `buy_ticket` - Purchases a ticket and mints NFT
- `update_event_price` - Updates ticket price (owner only)

### Account Structure
```rust
pub struct Event {
    pub authority: Pubkey,        // Event organizer
    pub name: String,             // Event name
    pub description: String,      // Event description
    pub location: String,         // Event location
    pub event_date: i64,          // Event timestamp
    pub sale_end_date: i64,       // Sale end timestamp
    pub ticket_price: u64,        // Price in lamports
    pub max_tickets: u32,         // Maximum tickets
    pub tickets_sold: u32,        // Tickets sold count
    pub collection_mint: Pubkey,  // NFT collection mint
    pub image_uri: String,        // Event image URL
    pub bump: u8,                 // PDA bump
}
```

## Frontend Features

### Wallet Integration
- Supports Phantom, Solflare, and Backpack wallets
- Automatic connection and reconnection
- Transaction signing and confirmation

### User Interface
- **Home Page**: Browse all available events
- **Event Details**: Detailed event information and ticket purchase
- **Create Event**: Form for event organizers
- **My Tickets**: View owned ticket NFTs

### Real-time Updates
- Live event status (active, expired, sold out)
- Real-time ticket availability
- Dynamic pricing updates

## Security Features

- **Access Control**: Owner-only functions protected
- **Input Validation**: Comprehensive validation on dates, prices, and quantities
- **PDA Security**: Program Derived Addresses for secure account generation
- **NFT Standards**: Follows Metaplex standards for compatibility

## Testing

### Program Tests
```bash
npm run test-program
```

### Manual Testing
1. Start local validator
2. Deploy program
3. Test event creation and ticket purchasing through frontend

## Deployment

### Devnet Deployment
```bash
solana config set --url devnet
npm run deploy-program
```

### Mainnet Deployment
```bash
solana config set --url mainnet-beta
npm run deploy-program
```

Update the program ID in:
- `Anchor.toml`
- `app/src/contexts/ProgramProvider.tsx`
- `programs/ticket-nft/src/lib.rs`

## Troubleshooting

### Common Issues

1. **Program deployment fails**
   - Ensure sufficient SOL balance
   - Check Solana CLI configuration
   - Verify program ID matches in all files

2. **Frontend connection issues**
   - Check wallet is connected
   - Verify network matches (devnet/mainnet)
   - Clear browser cache and reconnect wallet

3. **Transaction failures**
   - Ensure sufficient SOL for transaction fees
   - Check program is deployed on correct network
   - Verify account permissions

### Getting Help

- Check console logs for error messages
- Verify all dependencies are installed
- Ensure Solana validator is running for local development

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Anchor Framework](https://anchor-lang.com/)
- Uses [Metaplex Token Metadata](https://docs.metaplex.com/programs/token-metadata/)
- Frontend powered by [React](https://reactjs.org/) and [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)