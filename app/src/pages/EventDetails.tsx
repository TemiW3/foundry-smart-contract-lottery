import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../contexts/ProgramProvider';
import { fetchEvent, buyTicket, updateEventPrice } from '../utils/program';
import { Event } from '../types';
import { PublicKey } from '@solana/web3.js';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock, 
  ArrowLeft,
  Edit,
  ShoppingCart,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

const EventDetails: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { program } = useProgram();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingTicket, setBuyingTicket] = useState(false);
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [showPriceEdit, setShowPriceEdit] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    const loadEvent = async () => {
      if (!program || !eventId) {
        setLoading(false);
        return;
      }

      try {
        const eventPDA = new PublicKey(eventId);
        const eventData = await fetchEvent(program, eventPDA);
        setEvent(eventData);
        if (eventData) {
          setNewPrice((eventData.ticketPrice / 1e9).toString());
        }
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error('Event not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [program, eventId, navigate]);

  const handleBuyTicket = async () => {
    if (!connected || !publicKey || !program || !event || !eventId) {
      toast.error('Please connect your wallet first');
      return;
    }

    setBuyingTicket(true);

    try {
      const eventPDA = new PublicKey(eventId);
      const { tx } = await buyTicket(program, publicKey, eventPDA, event);
      
      toast.success('Ticket purchased successfully!');
      console.log('Transaction signature:', tx);
      
      // Refresh event data
      const updatedEvent = await fetchEvent(program, eventPDA);
      setEvent(updatedEvent);
    } catch (error) {
      console.error('Error buying ticket:', error);
      toast.error('Failed to purchase ticket. Please try again.');
    } finally {
      setBuyingTicket(false);
    }
  };

  const handleUpdatePrice = async () => {
    if (!connected || !publicKey || !program || !event || !eventId) {
      toast.error('Please connect your wallet first');
      return;
    }

    const priceValue = parseFloat(newPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setUpdatingPrice(true);

    try {
      const eventPDA = new PublicKey(eventId);
      const tx = await updateEventPrice(program, publicKey, eventPDA, priceValue);
      
      toast.success('Price updated successfully!');
      console.log('Transaction signature:', tx);
      
      // Refresh event data
      const updatedEvent = await fetchEvent(program, eventPDA);
      setEvent(updatedEvent);
      setShowPriceEdit(false);
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price. Please try again.');
    } finally {
      setUpdatingPrice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
        <button onClick={() => navigate('/')} className="btn-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </button>
      </div>
    );
  }

  const now = new Date();
  const isEventActive = now <= event.saleEndDate && event.ticketsSold < event.maxTickets;
  const isSoldOut = event.ticketsSold >= event.maxTickets;
  const isExpired = now > event.saleEndDate;
  const isOwner = connected && publicKey && event.authority.equals(publicKey);
  const canPurchase = connected && isEventActive && !isOwner;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Events</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event Image */}
        <div className="lg:col-span-2">
          <div className="aspect-video bg-gray-200 rounded-xl overflow-hidden mb-6">
            {event.imageUri ? (
              <img
                src={event.imageUri}
                alt={event.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/api/placeholder/800/450';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="h-24 w-24 text-gray-400" />
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="card p-8 space-y-6">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
              <div className="flex space-x-2">
                {isSoldOut && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                    <XCircle className="h-4 w-4 inline mr-1" />
                    Sold Out
                  </span>
                )}
                {isExpired && !isSoldOut && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
                    <XCircle className="h-4 w-4 inline mr-1" />
                    Expired
                  </span>
                )}
                {isEventActive && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Active
                  </span>
                )}
              </div>
            </div>

            <p className="text-gray-700 text-lg leading-relaxed">{event.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-500">Event Date</p>
                    <p className="font-medium">{format(event.eventDate, 'PPP')}</p>
                    <p className="text-sm text-gray-600">{format(event.eventDate, 'p')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{event.location}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-500">Sale Ends</p>
                    <p className="font-medium">{format(event.saleEndDate, 'PPP')}</p>
                    <p className="text-sm text-gray-600">{format(event.saleEndDate, 'p')}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-500">Tickets Available</p>
                    <p className="font-medium">
                      {event.maxTickets - event.ticketsSold} of {event.maxTickets}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Card */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-8">
            <div className="space-y-6">
              {/* Price */}
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <span className="text-3xl font-bold text-gray-900">
                    {(event.ticketPrice / 1e9).toFixed(2)}
                  </span>
                  <span className="text-xl text-gray-600">SOL</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">per ticket</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sold</span>
                  <span className="font-medium">
                    {event.ticketsSold}/{event.maxTickets}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(event.ticketsSold / event.maxTickets) * 100}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!connected ? (
                  <p className="text-center text-gray-600 text-sm">
                    Connect your wallet to purchase tickets
                  </p>
                ) : isOwner ? (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-gray-600 mb-4">
                      You are the event organizer
                    </p>
                    
                    {isEventActive && !showPriceEdit && (
                      <button
                        onClick={() => setShowPriceEdit(true)}
                        className="w-full btn-secondary"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Update Price
                      </button>
                    )}

                    {showPriceEdit && (
                      <div className="space-y-3">
                        <input
                          type="number"
                          value={newPrice}
                          onChange={(e) => setNewPrice(e.target.value)}
                          className="input text-center"
                          placeholder="New price in SOL"
                          step="0.01"
                          min="0"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setShowPriceEdit(false)}
                            className="btn-secondary text-sm"
                            disabled={updatingPrice}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdatePrice}
                            className="btn-primary text-sm"
                            disabled={updatingPrice}
                          >
                            {updatingPrice ? 'Updating...' : 'Update'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : canPurchase ? (
                  <button
                    onClick={handleBuyTicket}
                    disabled={buyingTicket}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {buyingTicket ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Buy Ticket
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full btn-secondary opacity-50 cursor-not-allowed"
                  >
                    {isSoldOut ? 'Sold Out' : 'Sale Ended'}
                  </button>
                )}
              </div>

              {/* Event Info */}
              <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Collection:</span>{' '}
                  <span className="font-mono text-xs">{event.collectionMint.toString().slice(0, 8)}...</span>
                </p>
                <p>
                  <span className="font-medium">Organizer:</span>{' '}
                  <span className="font-mono text-xs">{event.authority.toString().slice(0, 8)}...</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;