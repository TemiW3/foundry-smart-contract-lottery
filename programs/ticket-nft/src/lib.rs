use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
        CreateMetadataAccountsV3, Metadata,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::types::{CollectionDetails, Creator, DataV2};

declare_id!("HKvKkTgKzGz8FNVX2VjKcgQbNhZyJm8aJQ8x4rWZpump");

#[program]
pub mod ticket_nft {
    use super::*;

    pub fn create_event(
        ctx: Context<CreateEvent>,
        name: String,
        description: String,
        location: String,
        event_date: i64,
        sale_end_date: i64,
        ticket_price: u64,
        max_tickets: u32,
        image_uri: String,
    ) -> Result<()> {
        let event = &mut ctx.accounts.event;
        let clock = Clock::get()?;

        require!(
            sale_end_date > clock.unix_timestamp,
            TicketError::SaleEndDateInPast
        );
        require!(
            event_date > sale_end_date,
            TicketError::EventDateBeforeSaleEnd
        );
        require!(max_tickets > 0, TicketError::InvalidTicketCount);

        event.authority = ctx.accounts.authority.key();
        event.name = name;
        event.description = description;
        event.location = location;
        event.event_date = event_date;
        event.sale_end_date = sale_end_date;
        event.ticket_price = ticket_price;
        event.max_tickets = max_tickets;
        event.tickets_sold = 0;
        event.collection_mint = ctx.accounts.collection_mint.key();
        event.image_uri = image_uri;
        event.bump = ctx.bumps.event;

        // Create collection metadata
        let creator = vec![Creator {
            address: event.authority,
            verified: true,
            share: 100,
        }];

        let data_v2 = DataV2 {
            name: format!("{} Tickets", event.name),
            symbol: "TICKET".to_string(),
            uri: event.image_uri.clone(),
            seller_fee_basis_points: 500, // 5% royalty
            creators: Some(creator),
            collection: None,
            uses: None,
        };

        let seeds = &[
            b"event",
            ctx.accounts.authority.key().as_ref(),
            event.name.as_bytes(),
            &[event.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.collection_metadata.to_account_info(),
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    mint_authority: event.to_account_info(),
                    update_authority: event.to_account_info(),
                    payer: ctx.accounts.authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            data_v2,
            true, // is_mutable
            true, // update_authority_is_signer
            Some(CollectionDetails::V1 { size: 0 }),
        )?;

        // Create master edition for collection
        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.collection_master_edition.to_account_info(),
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    update_authority: event.to_account_info(),
                    mint_authority: event.to_account_info(),
                    payer: ctx.accounts.authority.to_account_info(),
                    metadata: ctx.accounts.collection_metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            Some(0), // max_supply (0 for unlimited collection)
        )?;

        // Mint collection NFT to event authority
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    to: ctx.accounts.collection_token_account.to_account_info(),
                    authority: event.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        Ok(())
    }

    pub fn buy_ticket(ctx: Context<BuyTicket>) -> Result<()> {
        let event = &mut ctx.accounts.event;
        let clock = Clock::get()?;

        // Check if sale is still active
        require!(
            clock.unix_timestamp <= event.sale_end_date,
            TicketError::SaleEnded
        );

        // Check if tickets are available
        require!(
            event.tickets_sold < event.max_tickets,
            TicketError::SoldOut
        );

        // Transfer payment
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &event.authority,
            event.ticket_price,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.event_authority.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Create ticket metadata
        let ticket_number = event.tickets_sold + 1;
        let creator = vec![Creator {
            address: event.authority,
            verified: false, // Will be verified by CPI
            share: 100,
        }];

        let data_v2 = DataV2 {
            name: format!("{} - Ticket #{}", event.name, ticket_number),
            symbol: "TICKET".to_string(),
            uri: format!("{}#{}", event.image_uri, ticket_number),
            seller_fee_basis_points: 500,
            creators: Some(creator),
            collection: Some(mpl_token_metadata::types::Collection {
                verified: false, // Will be verified by CPI
                key: event.collection_mint,
            }),
            uses: None,
        };

        let seeds = &[
            b"event",
            event.authority.as_ref(),
            event.name.as_bytes(),
            &[event.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Create ticket metadata
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.ticket_metadata.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    mint_authority: ctx.accounts.buyer.to_account_info(),
                    update_authority: ctx.accounts.buyer.to_account_info(),
                    payer: ctx.accounts.buyer.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                &[],
            ),
            data_v2,
            true, // is_mutable
            true, // update_authority_is_signer
            None,
        )?;

        // Create master edition for ticket
        create_master_edition_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.ticket_master_edition.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    update_authority: ctx.accounts.buyer.to_account_info(),
                    mint_authority: ctx.accounts.buyer.to_account_info(),
                    payer: ctx.accounts.buyer.to_account_info(),
                    metadata: ctx.accounts.ticket_metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            Some(1), // max_supply (1 for unique NFT)
        )?;

        // Mint ticket NFT to buyer
        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    to: ctx.accounts.ticket_token_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            1,
        )?;

        // Update event state
        event.tickets_sold += 1;

        Ok(())
    }

    pub fn update_event_price(ctx: Context<UpdateEventPrice>, new_price: u64) -> Result<()> {
        let event = &mut ctx.accounts.event;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp <= event.sale_end_date,
            TicketError::SaleEnded
        );

        event.ticket_price = new_price;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateEvent<'info> {
    #[account(
        init,
        payer = authority,
        space = Event::LEN,
        seeds = [b"event", authority.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub event: Account<'info, Event>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = event,
        mint::freeze_authority = event,
    )]
    pub collection_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = collection_mint,
        associated_token::authority = authority,
    )]
    pub collection_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub collection_master_edition: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTicket<'info> {
    #[account(
        mut,
        seeds = [b"event", event.authority.as_ref(), event.name.as_bytes()],
        bump = event.bump
    )]
    pub event: Account<'info, Event>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: This is the event authority who receives payment
    #[account(mut, address = event.authority)]
    pub event_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = buyer,
        mint::decimals = 0,
        mint::authority = buyer,
        mint::freeze_authority = buyer,
    )]
    pub ticket_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = buyer,
        associated_token::mint = ticket_mint,
        associated_token::authority = buyer,
    )]
    pub ticket_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub ticket_metadata: UncheckedAccount<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub ticket_master_edition: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateEventPrice<'info> {
    #[account(
        mut,
        seeds = [b"event", event.authority.as_ref(), event.name.as_bytes()],
        bump = event.bump,
        has_one = authority
    )]
    pub event: Account<'info, Event>,

    pub authority: Signer<'info>,
}

#[account]
pub struct Event {
    pub authority: Pubkey,
    pub name: String,
    pub description: String,
    pub location: String,
    pub event_date: i64,
    pub sale_end_date: i64,
    pub ticket_price: u64,
    pub max_tickets: u32,
    pub tickets_sold: u32,
    pub collection_mint: Pubkey,
    pub image_uri: String,
    pub bump: u8,
}

impl Event {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        4 + 50 + // name (String)
        4 + 500 + // description (String)
        4 + 100 + // location (String)
        8 + // event_date
        8 + // sale_end_date
        8 + // ticket_price
        4 + // max_tickets
        4 + // tickets_sold
        32 + // collection_mint
        4 + 200 + // image_uri (String)
        1; // bump
}

#[error_code]
pub enum TicketError {
    #[msg("Sale end date must be in the future")]
    SaleEndDateInPast,
    #[msg("Event date must be after sale end date")]
    EventDateBeforeSaleEnd,
    #[msg("Ticket count must be greater than 0")]
    InvalidTicketCount,
    #[msg("Ticket sale has ended")]
    SaleEnded,
    #[msg("All tickets have been sold")]
    SoldOut,
}