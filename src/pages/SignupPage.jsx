import React from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const SignupPage = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const dnaVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 30,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const nodeVariants = {
    animate: (i) => ({
      scale: [1, 1.3, 1],
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 2,
        repeat: Infinity,
        delay: i * 0.2
      }
    })
  };

  // Handle form submission
  const handleSignup = (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const userData = {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      username: formData.get('email'), // Using email as username for login
      password: formData.get('password'),
      createdAt: new Date().toISOString()
    };
    
    // Get existing users from localStorage
    const existingUsers = JSON.parse(localStorage.getItem('users')) || [];
    
    // Check if user already exists
    const userExists = existingUsers.some(user => user.email === userData.email);
    
    if (userExists) {
      alert('User with this email already exists!');
      return;
    }
    
    // Check if passwords match
    if (formData.get('password') !== formData.get('confirmPassword')) {
      alert('Passwords do not match!');
      return;
    }
    
    // Add new user
    const updatedUsers = [...existingUsers, userData];
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    
    // Store current user and redirect (optional)
    localStorage.setItem('currentUser', JSON.stringify(userData));
    alert('Registration successful! You can now login.');
    // window.location.href = '/'; // Redirect to login page
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
      <div className="grid md:grid-cols-2 bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden max-w-5xl w-full border border-white/10">
        {/* Animation Section */}
        <div className="hidden md:flex items-center justify-center p-10 relative overflow-hidden bg-gradient-to-tr from-cyan-900/20 to-purple-900/30">
          {/* DNA Strand Animation */}
          <motion.div
            className="relative w-64 h-64"
            variants={dnaVariants}
            initial="initial"
            animate="animate"
          >
            {/* DNA Strand */}
            <div className="absolute inset-0 flex justify-center">
              <div className="w-1 h-full bg-gradient-to-b from-cyan-400 to-purple-400" />
            </div>
            
            {/* DNA Nodes */}
            {[...Array(12)].map((_, i) => (
              <React.Fragment key={i}>
                <motion.div
                  className="absolute w-6 h-6 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/30"
                  style={{
                    top: `${i * 8}%`,
                    left: "30%"
                  }}
                  custom={i}
                  variants={nodeVariants}
                  animate="animate"
                />
                <motion.div
                  className="absolute w-6 h-6 rounded-full bg-purple-400 shadow-lg shadow-purple-400/30"
                  style={{
                    top: `${i * 8}%`,
                    right: "30%"
                  }}
                  custom={i + 0.5}
                  variants={nodeVariants}
                  animate="animate"
                />
              </React.Fragment>
            ))}
            
            {/* Floating Tech Elements */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="text-5xl"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity
                }}
              >
                🔒
              </motion.div>
            </div>
          </motion.div>
          
          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                background: Math.random() > 0.5 ? 'rgba(0, 224, 255, 0.6)' : 'rgba(162, 0, 255, 0.6)',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, (Math.random() - 0.5) * 60],
                x: [0, (Math.random() - 0.5) * 60],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                delay: Math.random() * 5
              }}
            />
          ))}
        </div>

        {/* Form Section - Changed to form element with onSubmit */}
        <Card className="rounded-none p-10 bg-gradient-to-br from-gray-900 to-gray-800 border-l border-white/10">
          <CardContent className="flex flex-col h-full justify-center">
            <motion.form
              onSubmit={handleSignup}
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-6"
            >
              <motion.h2 
                variants={itemVariants} 
                className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center"
              >
                Join Our Network
              </motion.h2>
              
              <motion.p variants={itemVariants} className="text-center text-gray-300 mb-8">
                Create your secure access credentials
              </motion.p>
              
              <motion.div variants={itemVariants}>
                <Input 
                  name="fullName"
                  placeholder="Full Name" 
                  className="bg-gray-800 border-gray-700 text-white" 
                  required
                />
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <Input 
                  name="email"
                  type="email" 
                  placeholder="Email Address" 
                  className="bg-gray-800 border-gray-700 text-white" 
                  required
                />
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <Input 
                  name="password"
                  type="password" 
                  placeholder="Password" 
                  className="bg-gray-800 border-gray-700 text-white" 
                  required
                  minLength="6"
                />
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <Input 
                  name="confirmPassword"
                  type="password" 
                  placeholder="Confirm Password" 
                  className="bg-gray-800 border-gray-700 text-white" 
                  required
                  minLength="6"
                />
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 text-white hover:from-cyan-500 hover:to-purple-500 py-3 shadow-lg shadow-cyan-500/20"
                >
                  Register Now
                </Button>
              </motion.div>
              
              <motion.p 
                variants={itemVariants} 
                className="text-center text-sm text-gray-400 mt-8"
              >
                Already have credentials?{' '}
                <Link 
                  to="/" 
                  className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-4"
                >
                  Login here
                </Link>
              </motion.p>
            </motion.form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;