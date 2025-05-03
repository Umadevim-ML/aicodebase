import React from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();

  // Animation variants (keep all existing animation code exactly the same)
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

  const gradientRingVariants = {
    initial: { rotate: 0 },
    animate: {
      rotate: 360,
      transition: {
        duration: 18,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const floatingOrbVariants = {
    float: {
      y: ["0%", "-15%", "0%"],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Updated login handler to use backend API
  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.elements.username.value;
    const password = e.target.elements.password.value;
  
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
  
      // ✅ Only save token (user data will come from /me later)
      localStorage.setItem('token', data.token);
      
      // Fetch user data separately (using the protected /me route)
      const userResponse = await fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      const userData = await userResponse.json();
      
      
      navigate('/dashboard');
  
    } catch (error) {
      console.error("Login error:", error);
      alert(error.message);
      localStorage.removeItem('token');
    }
  };
  

  // Keep all the existing JSX exactly the same
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
      <div className="grid md:grid-cols-2 bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden max-w-5xl w-full border border-white/10">
        {/* Form Section */}
        <Card className="rounded-none p-10 bg-gradient-to-br from-gray-900 to-gray-800 border-r border-white/10">
          <CardContent className="flex flex-col h-full justify-center">
            <motion.form
              onSubmit={handleLogin}
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-6"
            >
              <motion.h2
                variants={itemVariants}
                className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center"
              >
                Welcome Back
              </motion.h2>

              <motion.p variants={itemVariants} className="text-center text-gray-300 mb-8">
                Secure access to your AI defense system
              </motion.p>

              <motion.div variants={itemVariants}>
                <Input
                  name="username"
                  placeholder="Email"
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Input
                  name="password"
                  type="password"
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 text-white hover:from-cyan-500 hover:to-purple-500 py-3 shadow-lg shadow-cyan-500/20"
                >
                  Authenticate
                </Button>
              </motion.div>

              <motion.p
                variants={itemVariants}
                className="text-center text-sm text-gray-400 mt-8"
              >
                New to the system?{' '}
                <Link
                  to="/signup"
                  className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-4"
                >
                  Request access
                </Link>
              </motion.p>
            </motion.form>
          </CardContent>
        </Card>

        {/* Animation Section */}
        <div className="hidden md:flex items-center justify-center p-10 relative overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/30 via-purple-900/50 to-indigo-900/30" />

          {/* Floating Orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-12 h-12 rounded-full bg-cyan-400/20 blur-xl"
            variants={floatingOrbVariants}
            animate="float"
          />
          <motion.div
            className="absolute bottom-1/3 right-1/3 w-16 h-16 rounded-full bg-purple-400/20 blur-xl"
            variants={floatingOrbVariants}
            animate="float"
          />

          {/* Main Animation */}
          <motion.div
            className="relative w-64 h-64"
            variants={floatingOrbVariants}
            animate="pulse"
          >
            {/* Gradient Ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-transparent"
              style={{
                background: 'conic-gradient(from 0deg, transparent, #00e0ff, #a200ff, transparent)',
                mask: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(#fff, #fff)',
                maskComposite: 'exclude'
              }}
              variants={gradientRingVariants}
              initial="initial"
              animate="animate"
            />

            {/* Inner Ring */}
            <motion.div
              className="absolute inset-8 rounded-full border-2 border-cyan-400/30"
              animate={{
                rotate: -360,
                transition: {
                  duration: 24,
                  repeat: Infinity,
                  ease: "linear"
                }
              }}
            />

            {/* Core */}
            <div className="absolute inset-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity
                }}
                className="text-white text-lg font-bold"
              >
                AI
              </motion.div>
            </div>

            {/* Floating Particles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-white"
                style={{
                  top: `${Math.sin(i * Math.PI / 4) * 70 + 50}%`,
                  left: `${Math.cos(i * Math.PI / 4) * 70 + 50}%`,
                }}
                animate={{
                  y: [0, -15, 0],
                  opacity: [0.4, 1, 0.4],
                  scale: [1, 1.5, 1]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;