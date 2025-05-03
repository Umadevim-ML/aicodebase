import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FaPaperclip, FaMicrophone, FaRobot, FaTimes } from 'react-icons/fa';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Safely get and parse currentUser
  const currentUserString = localStorage.getItem('currentUser');
  const currentUser = currentUserString ? JSON.parse(currentUserString) : null;

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    navigate('/');
    window.location.reload();
  };

  // Toggle chat visibility
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Handle sending messages
  const sendMessage = () => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput && !selectedFile) return;

    if (trimmedInput) {
      appendMessage(trimmedInput, 'user');
      setUserInput('');
    }

    // Keep the chat panel open
    setIsChatOpen(true);

    // Here you would typically send the message to your backend
    // For now, we'll just simulate a bot response
    if (selectedFile) {
      const isImage = selectedFile.type.startsWith('image/');
      appendMessage(isImage ? '🧠 Processing your image...' : '🧠 Processing your file...', 'bot');
      
      // Simulate backend response
      setTimeout(() => {
        setMessages(prev => {
          const newMessages = [...prev];
          // Remove the "Processing..." message
          newMessages.pop();
          // Add the response
          newMessages.push({ text: '🤖 I received your file!', sender: 'bot' });
          return newMessages;
        });
      }, 1500);
      
      setSelectedFile(null);
    } else {
      // Simulate bot response for text messages
      setTimeout(() => {
        appendMessage('🤖 Thanks for your message!', 'bot');
      }, 500);
    }
};

  // Append message to chat
  const appendMessage = (text, sender) => {
    setMessages(prev => [...prev, { text, sender }]);
  };

  // Handle file selection
  const handleFileSelection = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      appendMessage(`📎 File attached: ${file.name}`, 'user');

      // Display preview if image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          appendMessage(e.target.result, 'image');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Audio recording functions
  const toggleAudioRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsRecording(true);
        audioChunksRef.current = [];
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (e) => {
          audioChunksRef.current.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          // Here you would send the audio to your backend
          appendMessage('🎤 Voice message sent', 'user');
          // Simulate processing
          setTimeout(() => {
            appendMessage('🤖 I heard your voice message!', 'bot');
          }, 1500);
        };
        
        mediaRecorder.start();
      } catch (error) {
        console.error('Error accessing microphone:', error);
        appendMessage('Could not access microphone. Please check permissions.', 'bot');
      }
    } else {
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8 relative">
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

      {/* Chatbot floating button */}
      <div 
        className={`fixed bottom-8 right-8 z-50 transition-all duration-300 ${isChatOpen ? 'opacity-0' : 'opacity-100'}`}
        onClick={toggleChat}
      >
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:shadow-2xl transition-shadow">
          <FaRobot className="text-white text-2xl" />
        </div>
      </div>

      {/* Chatbot panel */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-gray-800 shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col border-l border-gray-700">
          {/* Chat header */}
          <div className="bg-gray-900 p-4 flex justify-between items-center border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <FaRobot className="mr-2 text-cyan-400" />
              Code AI Assistant
            </h2>
            <button 
              onClick={toggleChat}
              className="text-gray-400 hover:text-white p-1 rounded-full"
            >
              <FaTimes />
            </button>
          </div>
          
          {/* Chat messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'image' ? (
                  <img 
                    src={message.text} 
                    alt="Preview" 
                    className="max-w-xs rounded-lg border border-gray-600"
                  />
                ) : (
                  <div 
                    className={`max-w-xs rounded-lg px-4 py-2 ${
                      message.sender === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    {message.text}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Input area */}
          <div className="p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex items-center mb-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-gray-700 text-white rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                onClick={sendMessage}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-r-lg transition-colors"
              >
                Send
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={triggerFileInput}
                className={`p-2 rounded-full ${selectedFile ? 'bg-green-600' : 'bg-gray-700'} text-white hover:bg-gray-600 transition-colors`}
                title="Attach file"
              >
                <FaPaperclip />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelection}
                className="hidden"
              />
              <button
                onClick={toggleAudioRecording}
                className={`p-2 rounded-full ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-gray-700'} text-white hover:bg-gray-600 transition-colors`}
                title="Voice message"
              >
                <FaMicrophone />
              </button>
            </div>
            {selectedFile && (
              <div className="mt-2 text-sm text-gray-300">
                Selected: {selectedFile.name}
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;