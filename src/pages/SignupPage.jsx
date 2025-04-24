import React from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import { motion } from 'framer-motion';
import graphic from '../assets/ai_graphic.png';
import { Link } from 'react-router-dom';


const SignupPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-500 p-4">
    <div className="grid md:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl">
      <div className="relative bg-gradient-to-bl from-purple-600 to-indigo-600 flex items-center justify-center">
        <motion.img
          src={graphic}
          alt="AI Graphic"
          className="w-full h-[500px] object-contain"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <Card className="rounded-none">
        <CardContent>
          <h2 className="text-3xl font-bold text-gray-800 text-center">Sign Up</h2>
          <p className="text-center text-gray-500 mt-2 mb-6">
            Create your account to start detecting vulnerabilities
          </p>
          <div className="space-y-4">
            <Input placeholder="Full Name" />
            <Input type="email" placeholder="Email Address" />
            <Input type="password" placeholder="Password" />
            <Input type="password" placeholder="Confirm Password" />
            <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
              Sign Up
            </Button>
          </div>
          <p className="text-center text-gray-400 my-4">Or sign up with</p>
          <div className="space-y-2">
            <Button className="w-full border flex items-center justify-center gap-2">
              <FcGoogle size={20} /> Google
            </Button>
            <Button className="w-full border flex items-center justify-center gap-2">
              <FaFacebook size={20} /> Facebook
            </Button>
            <p className="text-center text-sm text-gray-500 mt-4">
  Already have an account?{' '}
  <Link to="/" className="text-indigo-600 hover:underline font-medium">
    Log in
  </Link>
</p>

          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default SignupPage;