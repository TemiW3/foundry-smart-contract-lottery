import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './contexts/WalletProvider';
import { ProgramProvider } from './contexts/ProgramProvider';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CreateEvent from './pages/CreateEvent';
import EventDetails from './pages/EventDetails';
import MyTickets from './pages/MyTickets';

function App() {
  return (
    <WalletProvider>
      <ProgramProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create" element={<CreateEvent />} />
                <Route path="/event/:eventId" element={<EventDetails />} />
                <Route path="/my-tickets" element={<MyTickets />} />
              </Routes>
            </main>
            <Toaster position="top-right" />
          </div>
        </Router>
      </ProgramProvider>
    </WalletProvider>
  );
}

export default App;