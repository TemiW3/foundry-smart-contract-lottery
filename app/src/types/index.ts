import { PublicKey } from '@solana/web3.js';

export interface Event {
  authority: PublicKey;
  name: string;
  description: string;
  location: string;
  eventDate: Date;
  saleEndDate: Date;
  ticketPrice: number;
  maxTickets: number;
  ticketsSold: number;
  collectionMint: PublicKey;
  imageUri: string;
  bump: number;
}

export interface TicketNFT {
  mint: PublicKey;
  owner: PublicKey;
  eventName: string;
  ticketNumber: number;
  metadata: {
    name: string;
    symbol: string;
    uri: string;
  };
}

export interface CreateEventForm {
  name: string;
  description: string;
  location: string;
  eventDate: string;
  eventTime: string;
  saleEndDate: string;
  saleEndTime: string;
  ticketPrice: string;
  maxTickets: string;
  imageUri: string;
}