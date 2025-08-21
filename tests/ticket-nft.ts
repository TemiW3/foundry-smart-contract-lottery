import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TicketNft } from "../target/types/ticket_nft";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { expect } from "chai";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

describe("ticket-nft", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.TicketNft as Program<TicketNft>;
  const provider = anchor.getProvider();

  let eventAuthority: Keypair;
  let buyer: Keypair;
  let eventPDA: PublicKey;
  let collectionMint: Keypair;
  let eventName = "Test Concert";

  before(async () => {
    eventAuthority = Keypair.generate();
    buyer = Keypair.generate();
    collectionMint = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(eventAuthority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );

    // Get event PDA
    [eventPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("event"), eventAuthority.publicKey.toBuffer(), Buffer.from(eventName)],
      program.programId
    );
  });

  it("Creates an event", async () => {
    const [collectionMetadata] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), collectionMint.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [collectionMasterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const collectionTokenAccount = await getAssociatedTokenAddress(
      collectionMint.publicKey,
      eventAuthority.publicKey
    );

    const eventDate = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 days from now
    const saleEndDate = Math.floor(Date.now() / 1000) + 86400 * 3; // 3 days from now
    const ticketPrice = 0.1 * anchor.web3.LAMPORTS_PER_SOL; // 0.1 SOL
    const maxTickets = 100;

    await program.methods
      .createEvent(
        eventName,
        "A test concert event",
        "Test Venue, Test City",
        new anchor.BN(eventDate),
        new anchor.BN(saleEndDate),
        new anchor.BN(ticketPrice),
        maxTickets,
        "https://example.com/image.jpg"
      )
      .accounts({
        event: eventPDA,
        authority: eventAuthority.publicKey,
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
      .signers([eventAuthority, collectionMint])
      .rpc();

    // Fetch the event account
    const eventAccount = await program.account.event.fetch(eventPDA);
    
    expect(eventAccount.name).to.equal(eventName);
    expect(eventAccount.authority.toString()).to.equal(eventAuthority.publicKey.toString());
    expect(eventAccount.maxTickets).to.equal(maxTickets);
    expect(eventAccount.ticketsSold).to.equal(0);
    expect(eventAccount.ticketPrice.toNumber()).to.equal(ticketPrice);
  });

  it("Buys a ticket", async () => {
    const ticketMint = Keypair.generate();
    
    const [ticketMetadata] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), ticketMint.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [ticketMasterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        ticketMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const ticketTokenAccount = await getAssociatedTokenAddress(
      ticketMint.publicKey,
      buyer.publicKey
    );

    const eventAccountBefore = await program.account.event.fetch(eventPDA);
    const authorityBalanceBefore = await provider.connection.getBalance(eventAuthority.publicKey);

    await program.methods
      .buyTicket()
      .accounts({
        event: eventPDA,
        buyer: buyer.publicKey,
        eventAuthority: eventAuthority.publicKey,
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
      .signers([buyer, ticketMint])
      .rpc();

    // Check event account was updated
    const eventAccountAfter = await program.account.event.fetch(eventPDA);
    expect(eventAccountAfter.ticketsSold).to.equal(eventAccountBefore.ticketsSold + 1);

    // Check payment was transferred
    const authorityBalanceAfter = await provider.connection.getBalance(eventAuthority.publicKey);
    expect(authorityBalanceAfter).to.be.greaterThan(authorityBalanceBefore);

    // Check ticket token account exists and has 1 token
    const tokenAccountInfo = await provider.connection.getTokenAccountBalance(ticketTokenAccount);
    expect(tokenAccountInfo.value.uiAmount).to.equal(1);
  });

  it("Updates event price", async () => {
    const newPrice = 0.2 * anchor.web3.LAMPORTS_PER_SOL; // 0.2 SOL

    await program.methods
      .updateEventPrice(new anchor.BN(newPrice))
      .accounts({
        event: eventPDA,
        authority: eventAuthority.publicKey,
      })
      .signers([eventAuthority])
      .rpc();

    // Check price was updated
    const eventAccount = await program.account.event.fetch(eventPDA);
    expect(eventAccount.ticketPrice.toNumber()).to.equal(newPrice);
  });

  it("Fails to buy ticket when sold out", async () => {
    // First, create an event with only 1 ticket
    const smallEventName = "Small Event";
    const smallEventAuthority = Keypair.generate();
    const smallCollectionMint = Keypair.generate();

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(smallEventAuthority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL),
      "confirmed"
    );

    const [smallEventPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("event"), smallEventAuthority.publicKey.toBuffer(), Buffer.from(smallEventName)],
      program.programId
    );

    const [smallCollectionMetadata] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), smallCollectionMint.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );

    const [smallCollectionMasterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        smallCollectionMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const smallCollectionTokenAccount = await getAssociatedTokenAddress(
      smallCollectionMint.publicKey,
      smallEventAuthority.publicKey
    );

    // Create event with only 1 ticket
    await program.methods
      .createEvent(
        smallEventName,
        "Small event",
        "Small Venue",
        new anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 7),
        new anchor.BN(Math.floor(Date.now() / 1000) + 86400 * 3),
        new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL),
        1, // Only 1 ticket
        "https://example.com/small.jpg"
      )
      .accounts({
        event: smallEventPDA,
        authority: smallEventAuthority.publicKey,
        collectionMint: smallCollectionMint.publicKey,
        collectionTokenAccount: smallCollectionTokenAccount,
        collectionMetadata: smallCollectionMetadata,
        collectionMasterEdition: smallCollectionMasterEdition,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([smallEventAuthority, smallCollectionMint])
      .rpc();

    // Buy the only ticket
    const firstTicketMint = Keypair.generate();
    const [firstTicketMetadata] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), firstTicketMint.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [firstTicketMasterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        firstTicketMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const firstTicketTokenAccount = await getAssociatedTokenAddress(firstTicketMint.publicKey, buyer.publicKey);

    await program.methods
      .buyTicket()
      .accounts({
        event: smallEventPDA,
        buyer: buyer.publicKey,
        eventAuthority: smallEventAuthority.publicKey,
        ticketMint: firstTicketMint.publicKey,
        ticketTokenAccount: firstTicketTokenAccount,
        ticketMetadata: firstTicketMetadata,
        ticketMasterEdition: firstTicketMasterEdition,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([buyer, firstTicketMint])
      .rpc();

    // Try to buy another ticket (should fail)
    const secondTicketMint = Keypair.generate();
    const [secondTicketMetadata] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), secondTicketMint.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [secondTicketMasterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        secondTicketMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const secondTicketTokenAccount = await getAssociatedTokenAddress(secondTicketMint.publicKey, buyer.publicKey);

    try {
      await program.methods
        .buyTicket()
        .accounts({
          event: smallEventPDA,
          buyer: buyer.publicKey,
          eventAuthority: smallEventAuthority.publicKey,
          ticketMint: secondTicketMint.publicKey,
          ticketTokenAccount: secondTicketTokenAccount,
          ticketMetadata: secondTicketMetadata,
          ticketMasterEdition: secondTicketMasterEdition,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([buyer, secondTicketMint])
        .rpc();
      
      // Should not reach here
      expect.fail("Expected transaction to fail due to sold out event");
    } catch (error) {
      expect(error.message).to.include("SoldOut");
    }
  });
});