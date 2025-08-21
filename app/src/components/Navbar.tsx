import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Ticket, Plus, Home, User } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { connected } = useWallet();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 text-xl font-bold text-primary-600">
            <Ticket className="h-8 w-8" />
            <span>TicketNFT</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                isActive('/') 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Events</span>
            </Link>

            {connected && (
              <>
                <Link
                  to="/create"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/create') 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Event</span>
                </Link>

                <Link
                  to="/my-tickets"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/my-tickets') 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>My Tickets</span>
                </Link>
              </>
            )}
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center">
            <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700 !rounded-lg !px-4 !py-2 !text-sm !font-medium" />
          </div>
        </div>

        {/* Mobile Navigation */}
        {connected && (
          <div className="md:hidden pb-4">
            <div className="flex space-x-4">
              <Link
                to="/create"
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                  isActive('/create') 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Create</span>
              </Link>

              <Link
                to="/my-tickets"
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                  isActive('/my-tickets') 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                <User className="h-4 w-4" />
                <span>My Tickets</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;