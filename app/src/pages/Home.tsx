import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../contexts/ProgramProvider';
import { fetchAllEvents } from '../utils/program';
import { Event } from '../types';
import { PublicKey } from '@solana/web3.js';
import { Calendar, MapPin, Users, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';

const Home: React.FC = () => {
  const { connected } = useWallet();
  const { program } = useProgram();
  const [events, setEvents] = useState<Array<{ publicKey: PublicKey; account: Event }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      if (!program) {
        setLoading(false);
        return;
      }

      try {
        const allEvents = await fetchAllEvents(program);
        setEvents(allEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [program]);

  const isEventActive = (event: Event) => {
    const now = new Date();
    return now <= event.saleEndDate && event.ticketsSold < event.maxTickets;
  };

  const isSoldOut = (event: Event) => {
    return event.ticketsSold >= event.maxTickets;
  };

  const isExpired = (event: Event) => {
    const now = new Date();
    return now > event.saleEndDate;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          Decentralized Ticket Marketplace
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Buy and sell event tickets as NFTs on the Solana blockchain. 
          Secure, transparent, and truly owned by you.
        </p>
        {!connected && (
          <p className="text-primary-600 font-medium">
            Connect your wallet to get started!
          </p>
        )}
      </div>

      {/* Events Grid */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {events.length > 0 ? 'Available Events' : 'No Events Available'}
          </h2>
          {connected && (
            <Link
              to="/create"
              className="btn-primary"
            >
              Create Event
            </Link>
          )}
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600 mb-6">
              Be the first to create an event on our platform!
            </p>
            {connected && (
              <Link to="/create" className="btn-primary">
                Create First Event
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(({ publicKey, account: event }) => (
              <div key={publicKey.toString()} className="card p-6 hover:shadow-lg transition-shadow">
                {/* Event Image */}
                <div className="aspect-video bg-gray-200 rounded-lg mb-4 overflow-hidden">
                  {event.imageUri ? (
                    <img
                      src={event.imageUri}
                      alt={event.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/api/placeholder/400/225';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Event Info */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {event.name}
                    </h3>
                    <div className="flex space-x-1">
                      {isSoldOut(event) && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                          Sold Out
                        </span>
                      )}
                      {isExpired(event) && !isSoldOut(event) && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                          Expired
                        </span>
                      )}
                      {isEventActive(event) && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm line-clamp-2">
                    {event.description}
                  </p>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(event.eventDate, 'PPp')}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{event.location}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Sale ends: {format(event.saleEndDate, 'PPp')}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">
                          {(event.ticketPrice / 1e9).toFixed(2)} SOL
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span>
                          {event.ticketsSold}/{event.maxTickets}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/event/${publicKey.toString()}`}
                      className="btn-primary text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;