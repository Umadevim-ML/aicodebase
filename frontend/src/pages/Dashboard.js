import React from 'react';

const Dashboard = () => {
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-6">
          Welcome to your Dashboard, {currentUser?.fullName || 'User'}!
        </h1>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <p className="text-gray-300">
            You're now logged in and can access all protected features.
          </p>
          {/* Add your dashboard content here */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;