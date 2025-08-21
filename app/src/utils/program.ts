import { Program, BN, web3 } from '@coral-xyz/anchor';
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { CreateEventForm, Event } from '../types';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export const getEventPDA = (authority: PublicKey, name: string, programId: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('event'), authority.toBuffer(), Buffer.from(name)],
    programId
  );
};

export const getMetadataPDA = (mint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );
};

export const getMasterEditionPDA = (mint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
};

export const createEvent = async (
  program: Program,
  authority: PublicKey,
  formData: CreateEventForm
) => {
  const collectionMint = Keypair.generate();
  const [eventPDA] = getEventPDA(authority, formData.name, program.programId);
  const [collectionMetadata] = getMetadataPDA(collectionMint.publicKey);
  const [collectionMasterEdition] = getMasterEditionPDA(collectionMint.publicKey);
  
  const collectionTokenAccount = await getAssociatedTokenAddress(
    collectionMint.publicKey,
    authority
  );

  const eventDateTime = new Date(`${formData.eventDate}T${formData.eventTime}`);
  const saleEndDateTime = new Date(`${formData.saleEndDate}T${formData.saleEndTime}`);

  const tx = await program.methods
    .createEvent(
      formData.name,
      formData.description,
      formData.location,
      new BN(Math.floor(eventDateTime.getTime() / 1000)),
      new BN(Math.floor(saleEndDateTime.getTime() / 1000)),
      new BN(parseFloat(formData.ticketPrice) * web3.LAMPORTS_PER_SOL),
      parseInt(formData.maxTickets),
      formData.imageUri
    )
    .accounts({
      event: eventPDA,
      authority,
      collectionMint: collectionMint.publicKey,
      collectionTokenAccount,
      collectionMetadata,
      collectionMasterEdition,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([collectionMint])
    .rpc();

  return { tx, eventPDA, collectionMint: collectionMint.publicKey };
};

export const buyTicket = async (
  program: Program,
  buyer: PublicKey,
  eventPDA: PublicKey,
  eventData: Event
) => {
  const ticketMint = Keypair.generate();
  const [ticketMetadata] = getMetadataPDA(ticketMint.publicKey);
  const [ticketMasterEdition] = getMasterEditionPDA(ticketMint.publicKey);
  
  const ticketTokenAccount = await getAssociatedTokenAddress(
    ticketMint.publicKey,
    buyer
  );

  const tx = await program.methods
    .buyTicket()
    .accounts({
      event: eventPDA,
      buyer,
      eventAuthority: eventData.authority,
      ticketMint: ticketMint.publicKey,
      ticketTokenAccount,
      ticketMetadata,
      ticketMasterEdition,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([ticketMint])
    .rpc();

  return { tx, ticketMint: ticketMint.publicKey };
};

export const updateEventPrice = async (
  program: Program,
  authority: PublicKey,
  eventPDA: PublicKey,
  newPrice: number
) => {
  const tx = await program.methods
    .updateEventPrice(new BN(newPrice * web3.LAMPORTS_PER_SOL))
    .accounts({
      event: eventPDA,
      authority,
    })
    .rpc();

  return tx;
};

export const fetchEvent = async (program: Program, eventPDA: PublicKey): Promise<Event | null> => {
  try {
    const eventAccount = await program.account.event.fetch(eventPDA);
    return {
      authority: eventAccount.authority,
      name: eventAccount.name,
      description: eventAccount.description,
      location: eventAccount.location,
      eventDate: new Date(eventAccount.eventDate.toNumber() * 1000),
      saleEndDate: new Date(eventAccount.saleEndDate.toNumber() * 1000),
      ticketPrice: eventAccount.ticketPrice.toNumber(),
      maxTickets: eventAccount.maxTickets,
      ticketsSold: eventAccount.ticketsSold,
      collectionMint: eventAccount.collectionMint,
      imageUri: eventAccount.imageUri,
      bump: eventAccount.bump,
    };
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
};

export const fetchAllEvents = async (program: Program): Promise<Array<{ publicKey: PublicKey; account: Event }>> => {
  try {
    const events = await program.account.event.all();
    return events.map(event => ({
      publicKey: event.publicKey,
      account: {
        authority: event.account.authority,
        name: event.account.name,
        description: event.account.description,
        location: event.account.location,
        eventDate: new Date(event.account.eventDate.toNumber() * 1000),
        saleEndDate: new Date(event.account.saleEndDate.toNumber() * 1000),
        ticketPrice: event.account.ticketPrice.toNumber(),
        maxTickets: event.account.maxTickets,
        ticketsSold: event.account.ticketsSold,
        collectionMint: event.account.collectionMint,
        imageUri: event.account.imageUri,
        bump: event.account.bump,
      }
    }));
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};