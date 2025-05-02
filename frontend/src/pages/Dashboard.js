import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button'; // Adjust import path as needed

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Safely get and parse currentUser
  const currentUserString = localStorage.getItem('currentUser');
  const currentUser = currentUserString ? JSON.parse(currentUserString) : null;

  const handleLogout = () => {
    // Clear all auth-related data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    
    // Redirect to login page
    navigate('/');
    
    // Optional: Force reload to reset application state
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            Welcome to your Dashboard, {currentUser?.fullName || 'User'}!
          </h1>
          <Button 
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg shadow-lg transition-colors"
          >
            Logout
          </Button>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <p className="text-gray-300">
            You're now logged in.
          </p>
          {/* Add more dashboard content here */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;