import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
// Note: For production, you would need to install @metaplex-foundation/mpl-token-metadata
// import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { TicketNFT } from '../types';
import { Calendar, MapPin, Ticket, ExternalLink } from 'lucide-react';

const MyTickets: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [tickets, setTickets] = useState<TicketNFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTickets = async () => {
      if (!connected || !publicKey) {
        setLoading(false);
        return;
      }

      try {
        // Get all token accounts owned by the user
        const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });

        const ticketNFTs: TicketNFT[] = [];

        for (const tokenAccount of tokenAccounts.value) {
          const accountData = tokenAccount.account.data;
          const tokenAmount = connection.getTokenAccountBalance(tokenAccount.pubkey);
          
          // Check if this is an NFT (amount = 1, decimals = 0)
          const balance = await tokenAmount;
          if (balance.value.uiAmount === 1 && balance.value.decimals === 0) {
            try {
              // Get mint address from token account
              const mintPubkey = new PublicKey(accountData.slice(0, 32));
              
              // Get metadata account
              const [metadataPDA] = PublicKey.findProgramAddressSync(
                [
                  Buffer.from('metadata'),
                  new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
                  mintPubkey.toBuffer(),
                ],
                new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
              );

              // Fetch metadata
              const metadataAccount = await connection.getAccountInfo(metadataPDA);
              if (metadataAccount) {
                // For this demo, we'll create a mock metadata object
                // In production, you would deserialize the actual metadata
                const metadata = {
                  data: {
                    name: `Demo Event - Ticket #${Math.floor(Math.random() * 100)}`,
                    symbol: 'TICKET',
                    uri: 'https://example.com/metadata.json'
                  }
                };
                
                // Check if this is a ticket NFT (contains "Ticket" in the name or symbol)
                if (metadata.data.name.includes('Ticket') || metadata.data.symbol.includes('TICKET')) {
                  // Extract ticket number from name
                  const ticketNumberMatch = metadata.data.name.match(/#(\d+)/);
                  const ticketNumber = ticketNumberMatch ? parseInt(ticketNumberMatch[1]) : 0;
                  
                  // Extract event name (everything before " - Ticket #")
                  const eventNameMatch = metadata.data.name.match(/^(.+?) - Ticket #/);
                  const eventName = eventNameMatch ? eventNameMatch[1] : 'Unknown Event';

                  ticketNFTs.push({
                    mint: mintPubkey,
                    owner: publicKey,
                    eventName,
                    ticketNumber,
                    metadata: {
                      name: metadata.data.name,
                      symbol: metadata.data.symbol,
                      uri: metadata.data.uri,
                    },
                  });
                }
              }
            } catch (error) {
              // Skip this token if we can't process it
              console.log('Skipping token:', error);
            }
          }
        }

        setTickets(ticketNFTs);
      } catch (error) {
        console.error('Error loading tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, [connected, publicKey, connection]);

  if (!connected) {
    return (
      <div className="text-center py-16">
        <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">My Tickets</h1>
        <p className="text-gray-600 mb-6">Please connect your wallet to view your tickets.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
        <p className="text-gray-600">
          Your event tickets as NFTs on the Solana blockchain
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16">
          <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
          <p className="text-gray-600 mb-6">
            You haven't purchased any tickets yet. Browse available events to get started!
          </p>
          <a href="/" className="btn-primary">
            Browse Events
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <div key={ticket.mint.toString()} className="card p-6 hover:shadow-lg transition-shadow">
              {/* Ticket Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Ticket className="h-5 w-5 text-primary-600" />
                  <span className="text-sm font-medium text-primary-600">
                    Ticket #{ticket.ticketNumber}
                  </span>
                </div>
                <a
                  href={`https://explorer.solana.com/address/${ticket.mint.toString()}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* Event Name */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {ticket.eventName}
              </h3>

              {/* Ticket Metadata */}
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>
                  <span className="font-medium">NFT Name:</span> {ticket.metadata.name}
                </p>
                <p>
                  <span className="font-medium">Symbol:</span> {ticket.metadata.symbol}
                </p>
                <p className="break-all">
                  <span className="font-medium">Mint:</span>{' '}
                  <span className="font-mono text-xs">{ticket.mint.toString()}</span>
                </p>
              </div>

              {/* Metadata URI */}
              {ticket.metadata.uri && (
                <div className="pt-4 border-t">
                  <a
                    href={ticket.metadata.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
                  >
                    <span>View Metadata</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* NFT Badge */}
              <div className="mt-4 pt-4 border-t">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mr-1"></span>
                  Solana NFT
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">About Your Ticket NFTs</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            • Your tickets are stored as NFTs on the Solana blockchain, giving you true ownership.
          </p>
          <p>
            • Each ticket is unique and verifiable, preventing counterfeiting.
          </p>
          <p>
            • You can view your tickets in any Solana-compatible wallet or NFT marketplace.
          </p>
          <p>
            • Tickets cannot be duplicated or transferred without your permission.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyTickets;