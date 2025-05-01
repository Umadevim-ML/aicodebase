import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

const EducationSurvey = () => {
  const navigate = useNavigate();
  const controls = useAnimation();
  const [formData, setFormData] = useState({
    educationLevel: '',
    standard: '',
    codingLevel: '',
    strongLanguages: []
  });
  const [isSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activeInput, setActiveInput] = useState(null);
  const [progress, setProgress] = useState(0);

  // Calculate form progress
  useEffect(() => {
    let filled = 0;
    if (formData.educationLevel) filled++;
    if (formData.standard) filled++;
    if (formData.codingLevel) filled++;
    setProgress((filled / 3) * 100);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    controls.start({
      scale: [1, 1.02, 1],
      transition: { duration: 0.3 }
    });
  };

  const handleLanguageSelect = (language) => {
    setFormData(prev => {
      const languages = [...prev.strongLanguages];
      const index = languages.indexOf(language);
      if (index === -1) {
        languages.push(language);
      } else {
        languages.splice(index, 1);
      }
      return { ...prev, strongLanguages: languages };
    });
    setError(null);
    controls.start("pulse");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        userId: JSON.parse(localStorage.getItem('user'))._id
      };
      const response = await fetch('http://localhost:5000/api/edu-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Submission failed');
      }
      await response.json();
      navigate('/');
    } catch (error) {
      setError(error.message || 'Submission failed. Please try again.');
    }
  };

  const programmingLanguages = [
    'C', 'C++', 'Java', 'Python', 'JavaScript',
    'C#', 'Ruby', 'Go', 'Swift', 'Kotlin',
    'PHP', 'TypeScript', 'Rust', 'Dart'
  ];

  const educationOptions = {
    school: ['9th Grade', '10th Grade', '11th Grade', '12th Grade'],
    college: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    university: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year+'],
    other: ['Other']
  };

  // Floating particles configuration
  const particles = Array(40).fill(0).map((_, i) => ({
    id: i,
    size: Math.random() * 8 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 25 + 15,
    type: Math.random() > 0.5 ? 'circle' : 'path',
    color: `rgba(${Math.floor(Math.random() * 56 + 200)}, ${Math.floor(Math.random() * 56 + 200)}, 255, ${Math.random() * 0.3 + 0.1})`
  }));

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "backOut"
      }
    },
    hover: { 
      y: -3,
      transition: { duration: 0.2 }
    }
  };

  const inputVariants = {
    rest: { scale: 1 },
    focus: {
      scale: 1.02,
      boxShadow: "0 0 0 2px rgba(56, 182, 255, 0.2)",
      transition: { duration: 0.2 }
    }
  };

  const languageVariants = {
    initial: { scale: 1 },
    selected: { 
      scale: 1.05,
      boxShadow: "0 4px 20px -5px rgba(56, 182, 255, 0.5)",
      transition: { type: "spring", stiffness: 500 }
    },
    hover: {
      y: -2,
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.95 }
  };

  const progressBarVariants = {
    initial: { width: 0 },
    animate: { 
      width: `${progress}%`,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  // Binary code rain component
  const BinaryRain = () => {
    const columns = 15;
    const binary = ['0', '1'];
    
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        {Array(columns).fill(0).map((_, col) => (
          <motion.div 
            key={col}
            className="absolute top-0 text-cyan-400 text-xs font-mono"
            style={{
              left: `${(100 / columns) * col}%`,
              animationDelay: `${Math.random() * 2}s`
            }}
            initial={{ y: -100 }}
            animate={{ y: '100vh' }}
            transition={{
              duration: 5 + Math.random() * 15,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear"
            }}
          >
            {Array(20).fill(0).map((_, row) => (
              <div key={row} className="my-1 opacity-70">
                {binary[Math.floor(Math.random() * 2)]}
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    );
  };

  // Floating tech icons
  const techIcons = [
    '👨‍💻', '📚', '💻', '📱', '🔌', '📊', '🧮', '🔢', '🧠', '⚡'
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 overflow-hidden relative">
      {/* Background elements */}
      <BinaryRain />
      
      {/* Floating tech icons */}
      {techIcons.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl opacity-10"
          initial={{
            x: Math.random() * 100,
            y: Math.random() * 100,
            rotate: Math.random() * 360
          }}
          animate={{
            y: [0, Math.random() * 30 - 15, 0],
            x: [0, Math.random() * 20 - 10, 0],
            rotate: 360
          }}
          transition={{
            duration: 15 + Math.random() * 20,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear"
          }}
        >
          {icon}
        </motion.div>
      ))}

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            filter: 'blur(1px)',
            clipPath: particle.type === 'circle' ? 'circle(50%)' : 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
          }}
          initial={{ 
            opacity: 0,
            x: particle.x,
            y: particle.y,
            rotate: Math.random() * 360
          }}
          animate={{
            opacity: [0, 0.4, 0],
            x: particle.x + (Math.random() * 20 - 10),
            y: particle.y + (Math.random() * 20 - 10),
            rotate: 360
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            repeatType: 'loop',
            ease: "linear"
          }}
        />
      ))}

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
      >
        <motion.div
          whileHover={{ 
            scale: 1.005,
            boxShadow: "0 25px 50px -15px rgba(0, 255, 255, 0.1)"
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Card className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 shadow-2xl shadow-cyan-500/10 relative overflow-hidden">
            {/* Animated border gradient */}
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <svg width="100%" height="100%">
                <defs>
                  <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <motion.stop 
                      offset="0%" 
                      stopColor="#00ffff" 
                      animate={{
                        stopOpacity: [0.3, 0.7, 0.3],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    />
                    <motion.stop 
                      offset="100%" 
                      stopColor="#667eea"
                      animate={{
                        stopOpacity: [0.7, 0.3, 0.7],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    />
                  </linearGradient>
                </defs>
                <rect 
                  width="100%" 
                  height="100%" 
                  fill="none" 
                  stroke="url(#borderGradient)" 
                  strokeWidth="1"
                  strokeDasharray="10 5"
                  rx="0.75rem"
                />
              </svg>
            </motion.div>

            {/* Progress bar */}
            <motion.div 
              className="absolute top-0 left-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500"
              variants={progressBarVariants}
              initial="initial"
              animate="animate"
            />

            <CardContent className="p-8 relative z-10">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8 text-center"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mb-4 mx-auto shadow-lg"
                  animate={{
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                </motion.div>
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">
                  Education Profile
                </h2>
                <p className="text-gray-400">
                  Let's customize your learning experience
                </p>
              </motion.div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-6"
                  >
                    <div className="p-3 text-sm text-red-400 bg-red-900/30 rounded-lg border border-red-700/50 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  {/* Education Level */}
                  <motion.div
                    variants={itemVariants}
                    className="relative"
                    onFocus={() => setActiveInput('educationLevel')}
                    onBlur={() => setActiveInput(null)}
                  >
                    <label className="block text-gray-300 mb-2 text-sm font-medium">Education Level*</label>
                    <motion.div
                      variants={inputVariants}
                      initial="rest"
                      whileFocus="focus"
                      className="relative"
                    >
                      <select
                        name="educationLevel"
                        value={formData.educationLevel}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600/50 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-200 text-sm appearance-none"
                        required
                      >
                        <option value="">Select your education level</option>
                        <option value="school">School</option>
                        <option value="college">College</option>
                        <option value="university">University</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </motion.div>
                  </motion.div>

                  {/* Standard/Year */}
                  <motion.div
                    variants={itemVariants}
                    className="relative"
                    onFocus={() => setActiveInput('standard')}
                    onBlur={() => setActiveInput(null)}
                  >
                    <label className="block text-gray-300 mb-2 text-sm font-medium">Standard/Year*</label>
                    {formData.educationLevel ? (
                      <motion.div
                        variants={inputVariants}
                        initial="rest"
                        whileFocus="focus"
                        className="relative"
                      >
                        <select
                          name="standard"
                          value={formData.standard}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600/50 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-200 text-sm appearance-none"
                          required
                        >
                          <option value="">Select your {formData.educationLevel === 'school' ? 'standard' : 'year'}</option>
                          {educationOptions[formData.educationLevel]?.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </motion.div>
                    ) : (
                      <select
                        name="standard"
                        value={formData.standard}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg bg-gray-700/30 border border-gray-600/30 text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all duration-200 text-sm appearance-none"
                        required
                        disabled
                      >
                        <option value="">First select your education level</option>
                      </select>
                    )}
                  </motion.div>

                  {/* Coding Experience Level */}
                  <motion.div
                    variants={itemVariants}
                  >
                    <label className="block text-gray-300 mb-2 text-sm font-medium">Coding Experience Level*</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Beginner', 'Intermediate', 'Advanced', 'Professional'].map((level, index) => (
                        <motion.div
                          key={level}
                          className="flex items-center"
                          variants={itemVariants}
                          custom={index}
                        >
                          <input
                            type="radio"
                            id={level.toLowerCase()}
                            name="codingLevel"
                            value={level.toLowerCase()}
                            checked={formData.codingLevel === level.toLowerCase()}
                            onChange={handleChange}
                            className="hidden"
                          />
                          <motion.label 
                            htmlFor={level.toLowerCase()} 
                            className={`flex-1 py-2 px-3 rounded-lg border text-sm cursor-pointer transition-all ${
                              formData.codingLevel === level.toLowerCase()
                                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                                : 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-700/70'
                            }`}
                            variants={languageVariants}
                            initial="initial"
                            animate={formData.codingLevel === level.toLowerCase() ? "selected" : "initial"}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            {level}
                            {index === 0 && <span className="block text-xs text-gray-400 mt-1">0-1 years</span>}
                            {index === 1 && <span className="block text-xs text-gray-400 mt-1">1-3 years</span>}
                            {index === 2 && <span className="block text-xs text-gray-400 mt-1">3-5 years</span>}
                            {index === 3 && <span className="block text-xs text-gray-400 mt-1">5+ years</span>}
                          </motion.label>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Strong Programming Languages */}
                  <motion.div
                    variants={itemVariants}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-gray-300 text-sm font-medium">Strong Programming Languages</label>
                      <span className="text-xs text-gray-500">
                        {formData.strongLanguages.length} selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {programmingLanguages.map((language, index) => (
                        <motion.button
                          key={language}
                          type="button"
                          onClick={() => handleLanguageSelect(language)}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center ${
                            formData.strongLanguages.includes(language)
                              ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
                              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700/70 border border-gray-600/50'
                          }`}
                          variants={languageVariants}
                          initial="initial"
                          animate={formData.strongLanguages.includes(language) ? "selected" : "initial"}
                          whileHover="hover"
                          whileTap="tap"
                          custom={index}
                        >
                          {language}
                          {formData.strongLanguages.includes(language) && (
                            <motion.span
                              className="ml-1 text-cyan-400"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500 }}
                            >
                              ✓
                            </motion.span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div
                    variants={itemVariants}
                    className="pt-4"
                  >
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-70 group relative overflow-hidden"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Animated button shine */}
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                      <span className="relative z-10 flex items-center justify-center">
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <motion.span 
                              className="mr-2"
                              animate={{
                                rotate: [0, 10, -10, 0],
                                transition: {
                                  duration: 2,
                                  repeat: Infinity
                                }
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </motion.span>
                            Complete Profile
                          </>
                        )}
                      </span>
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EducationSurvey;