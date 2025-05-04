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
  const [userDetails, setUserDetails] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
 
  const currentUserString = localStorage.getItem('user');
  const currentUser = currentUserString ? JSON.parse(currentUserString) : null;

  // Fetch user details on component mount
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!currentUser?.username) return;
      
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/user/${currentUser.username}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUserDetails(data);
        }
      } catch (error) {
        console.error('Failed to fetch user details:', error);
      }
    };

    fetchUserDetails();
  }, [currentUser?.username]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const appendMessage = (text, sender) => {
    setMessages(prev => [...prev, { text, sender }]);
  };
  const sendMessage = async () => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput && !selectedFile) return;
  
    // Add user message to chat
    if (trimmedInput) {
      appendMessage(trimmedInput, 'user');
      setUserInput('');
    }
  
    // Keep the chat panel open
    setIsChatOpen(true);
  
    try {
      let body;
      let headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
  
      if (selectedFile) {
        // Use FormData for file uploads
        const formData = new FormData();
        if (trimmedInput) formData.append('query', trimmedInput);
        formData.append('file', selectedFile);
        if (currentUser?.username) formData.append('username', currentUser.username);
        body = formData;
        // Let browser set Content-Type with boundary for FormData
        headers = {};
      } else {
        // Use JSON for text-only messages
        body = JSON.stringify({
          query: trimmedInput,
          username: currentUser?.username
        });
      }
  
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        body: body,
        headers: headers,
        credentials: 'include'
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (data.transcribed) {
        appendMessage(`🎤 You said: ${data.transcribed}`, 'user');
      }
      
      if (data.response) {
        appendMessage(data.response, 'bot');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      appendMessage(`🤖 Error: ${error.message}`, 'bot');
    } finally {
      setSelectedFile(null);
    }
  };
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

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const toggleAudioRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsRecording(true);
        audioChunksRef.current = [];
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            if (currentUser?.username) formData.append('username', currentUser.username);
            
            appendMessage('🎤 Processing your voice message...', 'bot');
            
            const response = await fetch('http://127.0.0.1:8000/api/chat', {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to process audio');
            
            const data = await response.json();
            setMessages(prev => prev.filter(m => m.text !== '🎤 Processing your voice message...'));
            
            if (data.transcribed) {
              appendMessage(`🎤 You said: ${data.transcribed}`, 'user');
            }
            
            if (data.response) {
              appendMessage(data.response, 'bot');
            }
          } catch (error) {
            console.error('Error sending audio:', error);
            appendMessage('🤖 Failed to process audio. Please try again.', 'bot');
          }
        };
        
        mediaRecorder.start(1000); // Collect data every second
      } catch (error) {
        console.error('Error accessing microphone:', error);
        appendMessage('Could not access microphone. Please check permissions.', 'bot');
        setIsRecording(false);
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
            Welcome to your Dashboard, {currentUser?.username || 'User'}!
          </h1>
          <Button 
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg shadow-lg transition-colors"
          >
            Logout
          </Button>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          {userDetails && (
            <div className="text-gray-300 mb-4">
              <p>Education: {userDetails.educationLevel} {userDetails.standard}</p>
              <p>Coding Level: {userDetails.codingLevel}</p>
              <p>Strong Languages: {userDetails.strongLanguages.join(', ')}</p>
            </div>
          )}
          <p className="text-gray-300">
            You're now logged in. Click the chatbot icon to get personalized coding help!
          </p>
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
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center">
                <FaRobot className="mr-2 text-cyan-400" />
                {userDetails ? `${userDetails.username}'s Assistant` : 'Code AI Assistant'}
              </h2>
              {userDetails && (
                <div className="text-xs text-gray-400 mt-1">
                  {userDetails.educationLevel} • {userDetails.codingLevel} • {userDetails.strongLanguages.join(', ')}
                </div>
              )}
            </div>
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
                accept=".txt,.pdf,.docx,.py,.java,.c,.cpp,.js,.ts,.go,.rs,.rb,.php,.jpg,.jpeg,.png,.gif,.bmp,.mp3,.wav,.m4a,.ogg"
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