import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../contexts/ProgramProvider';
import { createEvent } from '../utils/program';
import { CreateEventForm } from '../types';
import toast from 'react-hot-toast';
import { Calendar, MapPin, DollarSign, Users, Image, FileText } from 'lucide-react';

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { program } = useProgram();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<CreateEventForm>({
    name: '',
    description: '',
    location: '',
    eventDate: '',
    eventTime: '',
    saleEndDate: '',
    saleEndTime: '',
    ticketPrice: '',
    maxTickets: '',
    imageUri: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !publicKey || !program) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      toast.error('Event name is required');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Event description is required');
      return;
    }

    if (!formData.location.trim()) {
      toast.error('Event location is required');
      return;
    }

    const eventDateTime = new Date(`${formData.eventDate}T${formData.eventTime}`);
    const saleEndDateTime = new Date(`${formData.saleEndDate}T${formData.saleEndTime}`);
    const now = new Date();

    if (saleEndDateTime <= now) {
      toast.error('Sale end date must be in the future');
      return;
    }

    if (eventDateTime <= saleEndDateTime) {
      toast.error('Event date must be after sale end date');
      return;
    }

    const ticketPrice = parseFloat(formData.ticketPrice);
    if (isNaN(ticketPrice) || ticketPrice <= 0) {
      toast.error('Please enter a valid ticket price');
      return;
    }

    const maxTickets = parseInt(formData.maxTickets);
    if (isNaN(maxTickets) || maxTickets <= 0) {
      toast.error('Please enter a valid number of tickets');
      return;
    }

    setLoading(true);

    try {
      const { tx, eventPDA } = await createEvent(program, publicKey, formData);
      
      toast.success('Event created successfully!');
      console.log('Transaction signature:', tx);
      console.log('Event PDA:', eventPDA.toString());
      
      navigate('/');
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Create Event</h1>
        <p className="text-gray-600 mb-6">Please connect your wallet to create an event.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
        <p className="text-gray-600">
          Create a new event and automatically generate NFT tickets for your attendees
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-8 space-y-6">
        {/* Event Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="h-4 w-4 inline mr-1" />
            Event Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="input"
            placeholder="Enter event name"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="input resize-none"
            placeholder="Describe your event..."
            required
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="h-4 w-4 inline mr-1" />
            Location *
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className="input"
            placeholder="Event location or venue"
            required
          />
        </div>

        {/* Event Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Event Date *
            </label>
            <input
              type="date"
              id="eventDate"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleInputChange}
              className="input"
              required
            />
          </div>
          <div>
            <label htmlFor="eventTime" className="block text-sm font-medium text-gray-700 mb-2">
              Event Time *
            </label>
            <input
              type="time"
              id="eventTime"
              name="eventTime"
              value={formData.eventTime}
              onChange={handleInputChange}
              className="input"
              required
            />
          </div>
        </div>

        {/* Sale End Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="saleEndDate" className="block text-sm font-medium text-gray-700 mb-2">
              Sale End Date *
            </label>
            <input
              type="date"
              id="saleEndDate"
              name="saleEndDate"
              value={formData.saleEndDate}
              onChange={handleInputChange}
              className="input"
              required
            />
          </div>
          <div>
            <label htmlFor="saleEndTime" className="block text-sm font-medium text-gray-700 mb-2">
              Sale End Time *
            </label>
            <input
              type="time"
              id="saleEndTime"
              name="saleEndTime"
              value={formData.saleEndTime}
              onChange={handleInputChange}
              className="input"
              required
            />
          </div>
        </div>

        {/* Ticket Price & Max Tickets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ticketPrice" className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Ticket Price (SOL) *
            </label>
            <input
              type="number"
              id="ticketPrice"
              name="ticketPrice"
              value={formData.ticketPrice}
              onChange={handleInputChange}
              className="input"
              placeholder="0.1"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label htmlFor="maxTickets" className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="h-4 w-4 inline mr-1" />
              Max Tickets *
            </label>
            <input
              type="number"
              id="maxTickets"
              name="maxTickets"
              value={formData.maxTickets}
              onChange={handleInputChange}
              className="input"
              placeholder="100"
              min="1"
              required
            />
          </div>
        </div>

        {/* Image URI */}
        <div>
          <label htmlFor="imageUri" className="block text-sm font-medium text-gray-700 mb-2">
            <Image className="h-4 w-4 inline mr-1" />
            Event Image URL
          </label>
          <input
            type="url"
            id="imageUri"
            name="imageUri"
            value={formData.imageUri}
            onChange={handleInputChange}
            className="input"
            placeholder="https://example.com/image.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional: URL to an image that represents your event
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Event...
              </div>
            ) : (
              'Create Event'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;