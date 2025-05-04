function handleKeyPress(event) {
    if (event.key === "Enter") sendMessage();
}

function sendMessage() {
    const userInputElem = document.getElementById("user-input");
    const userInput = userInputElem.value;
    const trimmedInput = userInput.trim();
    const username = localStorage.getItem('username') || 'default';
    console.log('Sending username:', username);
    if (!trimmedInput && !selectedFile) return;

    if (trimmedInput) {
        appendMessage(trimmedInput, "user");
        userInputElem.value = "";
    }

    // File upload case
    if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (trimmedInput) formData.append("query", trimmedInput);
        formData.append("username", username);

        const isImage = selectedFile.type.startsWith("image/");
        appendMessage(isImage ? "🧠 Processing your image..." : "🧠 Processing your file...", "bot");

        fetch("/chat", {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            const messages = document.querySelectorAll(".message.bot");
            const lastBotMessage = messages[messages.length - 1];
            if (lastBotMessage && lastBotMessage.innerText.includes("Processing")) {
                lastBotMessage.remove();
            }

            if (data.transcribed) appendMessage(data.transcribed, "user");
            if (data.response) {
                // Process response to handle code blocks
                processBotResponse(data.response);
            } else {
                appendMessage("🤖 No response.", "bot");
            }
        })
        .catch(err => {
            console.error("File upload error:", err);
            appendMessage("❌ Error processing your file.", "bot");
        });

        selectedFile = null;
    } else {
        // Text-only case
        fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                query: trimmedInput,
                username: username
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.response) {
                processBotResponse(data.response);
            } else {
                appendMessage("🤖 No response.", "bot");
            }
        })
        .catch(err => {
            console.error("Text send error:", err);
            appendMessage("❌ Error processing your message.", "bot");
        });
    }
}

function appendMessage(text, sender) {
    const chatContainer = document.getElementById("chat-container");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;
    
    // Check if the text contains code blocks
    const codeBlocks = extractCodeBlocks(text);
    
    if (codeBlocks.length > 0) {
        let processedText = text;
        
        // Replace code blocks with placeholders
        codeBlocks.forEach((block, index) => {
            processedText = processedText.replace(block, `__CODE_BLOCK_${index}__`);
        });
        
        // Create text nodes for non-code parts
        const textParts = processedText.split(/__CODE_BLOCK_\d+__/);
        textParts.forEach((part, i) => {
            if (part.trim()) {
                const textNode = document.createTextNode(part);
                messageDiv.appendChild(textNode);
            }
            
            if (i < codeBlocks.length) {
                const codeBlock = codeBlocks[i];
                const langMatch = codeBlock.match(/^```(\w+)/);
                const lang = langMatch ? langMatch[1] : '';
                const codeContent = codeBlock.replace(/```[\w]*\n?|\n?```$/g, '');
                
                const codeContainer = document.createElement("div");
                codeContainer.className = "code-container";
                
                const codeElement = document.createElement("pre");
                codeElement.className = "code-block";
                codeElement.textContent = codeContent;
                
                const copyButton = document.createElement("button");
                copyButton.className = "copy-btn";
                copyButton.textContent = "Copy";
                copyButton.onclick = function() {
                    copyToClipboard(codeContent);
                    copyButton.textContent = "Copied!";
                    copyButton.classList.add("copied");
                    setTimeout(() => {
                        copyButton.textContent = "Copy";
                        copyButton.classList.remove("copied");
                    }, 2000);
                };
                
                codeContainer.appendChild(codeElement);
                codeContainer.appendChild(copyButton);
                messageDiv.appendChild(codeContainer);
                
                // Apply syntax highlighting
                hljs.highlightElement(codeElement);
            }
        });
    } else {
        messageDiv.textContent = text;
    }
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function processBotResponse(response) {
    // Check if response contains code blocks
    if (response.includes("```")) {
        // Use appendMessage which handles code blocks
        appendMessage(response, "bot");
    } else {
        // Regular text response
        const chatContainer = document.getElementById("chat-container");
        const messageDiv = document.createElement("div");
        messageDiv.className = "message bot";
        messageDiv.textContent = response;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

function extractCodeBlocks(text) {
    const codeBlockRegex = /```[\s\S]*?```/g;
    return text.match(codeBlockRegex) || [];
}

function copyToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";  // Prevent scrolling to bottom
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand("copy");
    } catch (err) {
        console.error("Failed to copy text: ", err);
    }
    document.body.removeChild(textarea);
}

// File attachment functionality
function triggerFileInput() {
    document.getElementById('file-input').click();
}

let selectedFile = null;

function handleFileSelection(input) {
    if (input.files && input.files[0]) {
        selectedFile = input.files[0];
        const fileName = selectedFile.name;
        const fileType = selectedFile.type;
        const isImage = fileType.startsWith("image/");
        const isDocument = fileType === "application/pdf" ||
                         fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                         fileType === "text/plain";

        appendMessage(`📎 File attached: ${fileName}`, "user");

        if (isImage) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.createElement("img");
                img.src = e.target.result;
                img.style.maxWidth = "200px";
                img.style.borderRadius = "8px";
                img.style.marginTop = "5px";
                const chatContainer = document.getElementById("chat-container");
                const wrapper = document.createElement("div");
                wrapper.className = "message user";
                wrapper.appendChild(img);
                chatContainer.appendChild(wrapper);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            };
            reader.readAsDataURL(selectedFile);
        } else if (isDocument) {
            const icon = document.createElement("div");
            icon.innerHTML = `📄 <strong>${fileName}</strong>`;
            icon.style.marginTop = "5px";
            icon.style.padding = "10px";
            icon.style.border = "1px solid #ccc";
            icon.style.borderRadius = "6px";
            icon.style.backgroundColor = "#f9f9f9";
            icon.style.display = "inline-block";

            const chatContainer = document.getElementById("chat-container");
            const wrapper = document.createElement("div");
            wrapper.className = "message user";
            wrapper.appendChild(icon);
            chatContainer.appendChild(wrapper);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        input.value = "";
    }
}

// Audio recording functionality
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

function toggleAudioRecording() {
    const audioBtn = document.getElementById('audio-btn');
    
    if (!isRecording) {
        // Start recording
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                isRecording = true;
                audioBtn.classList.add('recording');
                audioBtn.innerHTML = '<i class="fas fa-stop"></i>';
                
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    const mimeType = mediaRecorder.mimeType || 'audio/webm';
                    const audioBlob = new Blob(audioChunks, { type: mimeType });
                    const username = localStorage.getItem('username') || 'default';
                
                    appendMessage("🧠 Processing your voice message...", "bot");
                
                    const formData = new FormData();
                    formData.append("file", audioBlob, "voice-input.m4a");
                    formData.append("username", username);
                
                    fetch("/chat", {
                        method: "POST",
                        body: formData,
                        credentials: 'include'  
                    })
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        const messages = document.querySelectorAll(".message.bot");
                        const lastBotMessage = messages[messages.length - 1];
                        if (lastBotMessage && lastBotMessage.innerText === "🧠 Processing your voice message...") {
                            lastBotMessage.remove();
                        }
                    
                        // Show the transcribed text as user message
                        if (data.transcribed) {
                            appendMessage(data.transcribed, "user");
                        }
                        // Show the LLM response as bot message
                        if (data.response) {
                            processBotResponse(data.response);
                        }
                    })
                    .catch(err => {
                        console.error("Error processing voice message:", err);
                        appendMessage("❌ Error processing your voice message. Try again.", "bot");
                    });
                };
                
                mediaRecorder.start();
            })
            .catch(error => {
                console.error("Error accessing microphone:", error);
                appendMessage("Could not access microphone. Please check permissions.", "bot");
            });
    } else {
        // Stop recording
        isRecording = false;
        audioBtn.classList.remove('recording');
        audioBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
}

// Enable audio for iOS devices
document.addEventListener('touchstart', function() {
    const silentAudio = document.createElement('audio');
    silentAudio.setAttribute('src', 'data:audio/mp3;base64,//MkxAAHiAICWABElBeKPL/RANb2w+yiT1g/gTok//lP/W/l3h8QO/OCdCqCW2Cw//MkxAQHkAIWUAhEmAQXWUOFW2dxPu//9mr60ElY5sseQ+xxesmHKtZr7bsqqX2L//MkxAgFwAYiQAhEAC2hq22d3///9FTV6tA36JdgBJoOGgc+7qvqej5Zu7/7uI9l//MkxBQHAAYi8AhEAO193vt9KGOq+6qcT7hhfN5FTInmwk8RkqKImTM55pRQHQSq//MkxBsGkgoIAABHhTACIJLf99nVI///yuW1uBqWfEu7CgNPWGpUadBmZ////4sL//MkxCMHMAH9iABEmAsKioqKigsLCwtVTEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVV//MkxCkECAUYCAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
    silentAudio.volume = 0;
    document.body.appendChild(silentAudio);
    silentAudio.play().then(() => {
        silentAudio.remove();
    }).catch(e => {
        console.log("iOS audio initialization failed:", e);
    });
}, { once: true });