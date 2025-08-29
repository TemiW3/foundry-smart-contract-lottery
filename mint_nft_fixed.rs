use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;
use mpl_token_metadata::{
    instructions::{CreateMetadataAccountV3, CreateMasterEditionV3},
    types::{DataV2, Creator},
};
use solana_program::program::invoke;
use crate::state::*;
use crate::errors::*;

pub fn mint_nft(ctx: Context<MintThankYouNft>, name: String, symbol: String, uri: String, _tip_count: u64) -> Result<()> {
    require!(name.len() <= 32, TippingError::NameTooLong);
    require!(symbol.len() <= 10, TippingError::SymbolTooLong);
    require!(uri.len() <= 200, TippingError::UriTooLong);
    
    let tip_record = &mut ctx.accounts.tip_record;
    let thank_you_nft = &mut ctx.accounts.thank_you_nft;

    require!(!tip_record.nft_minted, TippingError::NftAlreadyMinted);

    // Initialize the thank you NFT account
    thank_you_nft.mint = ctx.accounts.mint.key();
    thank_you_nft.tipper = ctx.accounts.tipper.key();
    thank_you_nft.tip_amount = tip_record.amount;
    thank_you_nft.issued_at = Clock::get()?.unix_timestamp;
    thank_you_nft.bump = ctx.bumps.thank_you_nft;

    // Get the seeds for signing
    let tip_record_key = tip_record.key();
    let nft_seeds = &[
        b"thank_you_nft",
        tip_record_key.as_ref(),
        &[ctx.bumps.thank_you_nft],
    ];
    let signer_seeds = &[&nft_seeds[..]];

    // Mint 1 token to the tipper's token account
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            token::MintTo { 
                mint: ctx.accounts.mint.to_account_info(), 
                to: ctx.accounts.token_account.to_account_info(), 
                authority: ctx.accounts.thank_you_nft.to_account_info() // NFT account is mint authority
            },
            signer_seeds
        ), 
        1
    )?;

    // Create metadata
    let creators = vec![Creator {
        address: ctx.accounts.tipper.key(),
        verified: true,
        share: 100,
    }];
    
    let metadata_data = DataV2 {
        name,
        symbol,
        uri,
        seller_fee_basis_points: 0,
        creators: Some(creators),
        collection: None,
        uses: None,
    };

    // Create metadata using the new instruction builder pattern
    let create_metadata_ix = CreateMetadataAccountV3 {
        metadata: ctx.accounts.metadata.key(),
        mint: ctx.accounts.mint.key(),
        mint_authority: ctx.accounts.thank_you_nft.key(), // NFT account is mint authority
        payer: ctx.accounts.tipper.key(),
        update_authority: (ctx.accounts.thank_you_nft.key(), true), // NFT account is update authority
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    }
    .instruction(mpl_token_metadata::instructions::CreateMetadataAccountV3InstructionArgs {
        data: metadata_data,
        is_mutable: false,
        collection_details: None,
    });

    // Execute create metadata instruction
    invoke(
        &create_metadata_ix,
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.thank_you_nft.to_account_info(), // mint_authority
            ctx.accounts.tipper.to_account_info(), // payer
            ctx.accounts.thank_you_nft.to_account_info(), // update_authority
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;

    // Create master edition using the new instruction builder pattern
    let create_master_edition_ix = CreateMasterEditionV3 {
        edition: ctx.accounts.master_edition.key(),
        mint: ctx.accounts.mint.key(),
        update_authority: ctx.accounts.thank_you_nft.key(), // NFT account is update authority
        mint_authority: ctx.accounts.thank_you_nft.key(), // NFT account is mint authority
        payer: ctx.accounts.tipper.key(),
        metadata: ctx.accounts.metadata.key(),
        token_program: ctx.accounts.token_program.key(),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    }
    .instruction(mpl_token_metadata::instructions::CreateMasterEditionV3InstructionArgs {
        max_supply: Some(0), // 0 means unlimited supply, use Some(1) for unique NFT
    });

    // Execute create master edition instruction
    invoke(
        &create_master_edition_ix,
        &[
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.thank_you_nft.to_account_info(), // update_authority
            ctx.accounts.thank_you_nft.to_account_info(), // mint_authority
            ctx.accounts.tipper.to_account_info(), // payer
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;

    // Mark NFT as minted
    tip_record.nft_minted = true;

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String, tip_count: u64)]
pub struct MintThankYouNft<'info> {
    #[account(mut)]
    pub tipper: Signer<'info>,

    #[account(
        seeds = [b"tipping_pool", tipping_pool.authority.as_ref()],
        bump = tipping_pool.bump,
    )]
    pub tipping_pool: Account<'info, TippingPool>,

    #[account(
        mut,
        seeds = [
            b"tip_record",
            tipper.key().as_ref(),
            tipping_pool.authority.as_ref(),
            tipping_pool.tip_count.to_le_bytes().as_ref()
        ],
        constraint = !tip_record.nft_minted @ TippingError::NftAlreadyMinted,
        bump = tip_record.bump,
    )]
    pub tip_record: Account<'info, TipRecord>,

    #[account(
        init,
        payer = tipper,
        space = 8 + ThankYouNft::INIT_SPACE,
        seeds = [b"thank_you_nft", tip_record.key().as_ref()],
        bump
    )]
    pub thank_you_nft: Account<'info, ThankYouNft>,

    #[account(
        init,
        payer = tipper,
        mint::decimals = 0,
        mint::authority = thank_you_nft,
        mint::freeze_authority = thank_you_nft,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = tipper,
        associated_token::mint = mint,
        associated_token::authority = tipper,
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// CHECK: This account will be initialized by the metadata program
    #[account(
        mut,
        seeds = [
            b"metadata",
            mpl_token_metadata::ID.as_ref(),
            mint.key().as_ref(),
        ],
        bump,
        seeds::program = mpl_token_metadata::ID,
    )]
    pub metadata: UncheckedAccount<'info>,
    
    /// CHECK: This account will be initialized by the metadata program
    #[account(
        mut,
        seeds = [
            b"metadata",
            mpl_token_metadata::ID.as_ref(),
            mint.key().as_ref(),
            b"edition",
        ],
        bump,
        seeds::program = mpl_token_metadata::ID,
    )]
    pub master_edition: UncheckedAccount<'info>,
    
    /// CHECK: This is the Metaplex Token Metadata program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}