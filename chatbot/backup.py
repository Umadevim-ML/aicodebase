import json
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_socketio import SocketIO
import groq
import re
import os
from dotenv import load_dotenv
import base64
from PyPDF2 import PdfReader
import docx
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage
from werkzeug.utils import secure_filename
from typing import Dict, List, Optional
import tempfile
import mimetypes
from threading import Lock
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory

load_dotenv()

# Initialize Flask app with SocketIO
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "default-secret-key")
CORS(app, 
     resources={
         r"/api/*": {
             "origins": ["http://localhost:3000"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True
         }
     })

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = jsonify({"message": "CORS preflight"})
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response

socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize Groq client
groq_api_key = os.getenv("GROQ_API_KEY")
client = groq.Client(api_key=groq_api_key) 

# Initialize embedding model for RAG
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Global index and mapping for code documentation
index = faiss.IndexFlatL2(384)
id_to_text: Dict[int, str] = {}
next_id = 0 

# Session storage for conversation histories and processing locks
session_histories: Dict[str, ChatMessageHistory] = {}
session_locks: Dict[str, Lock] = {}

# Initialize LangChain components
chat_llm = ChatGroq(
    temperature=0.7,
    model_name="llama3-70b-8192",
    groq_api_key=groq_api_key
)

# Supported file extensions
SUPPORTED_TEXT_EXTENSIONS = {'.txt', '.py', '.java', '.c', '.cpp', '.js', '.ts', '.go', '.rs', '.rb', '.php'}
SUPPORTED_DOC_EXTENSIONS = {'.pdf', '.docx'}
SUPPORTED_AUDIO_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.ogg'}
SUPPORTED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp'}

def get_session_lock(session_id: str) -> Lock:
    """Get or create processing lock for a session"""
    if session_id not in session_locks:
        session_locks[session_id] = Lock()
    return session_locks[session_id]

def get_session_history(session_id: str) -> ChatMessageHistory:
    """Get or create chat history for a session"""
    if session_id not in session_histories:
        session_histories[session_id] = ChatMessageHistory()
    return session_histories[session_id]

def get_conversation_chain(session_id: str, intent: str) -> LLMChain:
    """Create appropriate LangChain chain based on intent"""
    history = get_session_history(session_id)
    
    # Common components
    memory = ConversationBufferMemory(
        return_messages=True,
        memory_key="history",
        chat_memory=history
    )
    
    # Base prompt template
    if intent == "greeting":
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a friendly Coding AI assistant. Respond to greetings briefly and concisely in 1-2 sentences."),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}")
        ])
    elif intent == "non_coding":
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a specialized Coding Assistant AI. Politely redirect non-coding questions by explaining your specialty in programming help in 1-2 sentences."),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}")
        ])
    elif intent == "teaching":
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a Patient Programming Teacher. Your task is to:
1. Explain programming concepts clearly and simply
2. Break down complex topics into digestible parts
3. Provide practical examples
4. Use analogies when helpful
5. Answer follow-up questions thoroughly
6. Format code examples properly
7. Keep explanations concise but comprehensive"""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}")
        ])
    else:  # All other coding intents
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an Expert Coding Assistant with 15+ years of experience in:
- Python, JavaScript, Java, C++, C#, Go, Rust
- Web Development (React, Angular, Vue, Django, Flask, Spring)
- Mobile Development (React Native, Flutter, Swift, Kotlin)
- Databases (SQL, NoSQL, ORMs)
- Algorithms & Data Structures
- System Design
- DevOps & Cloud (AWS, GCP, Azure)
- Machine Learning & AI
if ask for a sample code just provide the code and no explanation.
if ask for an explanation, provide a detailed explanation of the code and its components.
Guidelines:
1. Provide clear, concise, accurate code solutions
2. Explain complex concepts in simple terms
3. For code generation, include comments and examples
4. For debugging, explain the issue and solution
5. Suggest best practices and optimizations
6. Format code properly with language specification
7. Keep responses concise and to the point
8. Always be respectful and professional
9. If unsure, ask clarifying questions"""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}")
        ])
    
    return LLMChain(
        llm=chat_llm,
        prompt=prompt,
        memory=memory,
        verbose=False
    )

def detect_intent_llm(text: str) -> List[Dict[str, str]]:
    """
    Detect intent of user query using Llama3-70b-8192
    Returns list of detected intents and queries
    """
    prompt = [
        {
            "role": "system",
            "content": (
                "You are an AI that classifies user queries about programming and coding.\n"
                "Classify the intent into one of these categories:\n"
                "1. greeting - Simple greetings or small talk\n"
                "2. code_explanation - Requests to explain code concepts or existing code\n"
                "3. code_generation - Requests to write new code\n"
                "4. debug_help - Requests to debug or fix code\n"
                "5. optimization - Requests to optimize existing code\n"
                "6. learning_path - Requests for learning resources or paths\n"
                "7. code_review - Requests to review existing code\n"
                "8. teaching - Requests to teach or explain programming concepts\n"
                "9. non_coding - Anything not related to programming\n"
                "Reply in JSON format: [{\"query\": \"user message\", \"intent\": \"detected_intent\"}]\n"
                "If the query contains multiple intents, split them into separate items."
            )
        },
        {
            "role": "user",
            "content": f"User message: {text}"
        }
    ]

    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=prompt,
            response_format={"type": "json_object"},
            temperature=0.2
        )

        result = json.loads(response.choices[0].message.content)
        if isinstance(result, dict):
            result = [result]  # Convert single item to list
        return result
    except Exception as e:
        print("Intent detection error:", e)
        return [{"query": text, "intent": "non_coding"}]

def clean_response(text: str) -> str:
    """Clean and format the LLM response"""
    text = re.sub(r'```(.*?)```', r'\1', text, flags=re.DOTALL)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    return text.strip()

def store_and_index_text(text: str) -> None:
    """Store text chunks in vector index"""
    global next_id
    chunks = [text[i:i+500] for i in range(0, len(text), 500)]
    
    for chunk in chunks:
        embedding = embedding_model.encode(chunk, normalize_embeddings=True).astype("float32")
        index.add(np.array([embedding]))
        id_to_text[next_id] = chunk
        next_id += 1

def retrieve_relevant_text(query: str, top_k: int = 3) -> Optional[str]:
    """Retrieve relevant text chunks using RAG"""
    if next_id == 0:  # No documents indexed
        return None
        
    query_embedding = embedding_model.encode(query, normalize_embeddings=True).reshape(1, -1).astype("float32")
    distances, indices = index.search(query_embedding, top_k)
    retrieved = [id_to_text.get(i, "") for i in indices[0] if i >= 0]
    return "\n".join(retrieved) if retrieved else None

def extract_text_from_file(file) -> str:
    """Extract text from various file types"""
    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    
    try:
        if ext in SUPPORTED_TEXT_EXTENSIONS:
            return file.read().decode('utf-8')
        elif ext == '.pdf':
            reader = PdfReader(file)
            return "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
        elif ext == '.docx':
            doc = docx.Document(file)
            return "\n".join([para.text for para in doc.paragraphs])
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    except Exception as e:
        print(f"Error extracting text from {filename}: {str(e)}")
        raise

def process_audio_file(file) -> str:
    """Transcribe audio file using Groq's Whisper API"""
    try:
        # Save to temp file with proper extension
        temp_ext = '.webm'  # Default for recorded audio
        if file.filename:
            ext = os.path.splitext(secure_filename(file.filename))[1].lower()
            if ext in SUPPORTED_AUDIO_EXTENSIONS:
                temp_ext = ext
                
        with tempfile.NamedTemporaryFile(suffix=temp_ext, delete=False) as temp:
            file.save(temp.name)
            
            with open(temp.name, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=(temp.name, audio_file.read()),
                    model="whisper-large-v3-turbo",
                    response_format="text",
                    language="en",
                )
                return str(transcription)
    except Exception as e:
        print(f"Audio transcription error: {str(e)}")
        raise
    finally:
        if 'temp' in locals() and temp and os.path.exists(temp.name):
            os.unlink(temp.name)

def process_image_file(file) -> str:
    """Extract text/description from image using Llama-4-Scout"""
    try:
        # Save to temp file
        ext = os.path.splitext(file.filename)[1].lower()
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp:
            file.save(temp.name)
            
            with open(temp.name, "rb") as img_file:
                image_data = base64.b64encode(img_file.read()).decode('utf-8')
                
                response = client.chat.completions.create(
                    model="meta-llama/llama-4-scout-17b-16e-instruct",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an AI that can analyze images. Describe the image content in detail, focusing on any text or code present."
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": f"data:image/{ext[1:]};base64,{image_data}"
                                },
                                {
                                    "type": "text",
                                    "text": "Describe this image in detail, especially any text or code content."
                                }
                            ]
                        }
                    ],
                    max_tokens=1000
                )
                return response.choices[0].message.content
    except Exception as e:
        print(f"Image processing error: {str(e)}")
        raise
    finally:
        if 'temp' in locals() and temp and os.path.exists(temp.name):
            os.unlink(temp.name)

def handle_detected_intent(text: str, session_id: str) -> jsonify:
    """Handle the detected intent and generate appropriate response"""
    sub_queries = detect_intent_llm(text)
    print("Detected sub-queries:", sub_queries)

    responses = []
    
    for item in sub_queries:
        query = item["query"]
        intent = item["intent"]
        print(f"Processing intent '{intent}' for query: {query}")

        # Get session lock to ensure sequential processing
        session_lock = get_session_lock(session_id)
        with session_lock:
            # Get appropriate chain
            chain = get_conversation_chain(session_id, intent)
            
            # Add context if available (except for greetings/non-coding)
            context = None
            if intent not in ["greeting", "non_coding"]:
                context = retrieve_relevant_text(query)
            
            # Prepare input
            input_text = f"Context:\n{context}\n\nQuestion:\n{query}" if context else query
            
            # Generate response
            raw_response = chain.run(input=input_text)
            clean_response_text = clean_response(raw_response)
            
            responses.append(clean_response_text)
    
    return jsonify({"response": "\n\n".join(responses)})

@app.route("/chat", methods=['POST', 'OPTIONS'])
def chat():
    """Main chat endpoint handling text, files, audio, and images"""
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight'}), 200
    
    session_id = request.cookies.get('session_id') or str(hash(request.remote_addr))
    
    try:
        # Check content type - be more permissive with FormData
        is_form_data = 'multipart/form-data' in (request.content_type or '')
        
        # Handle file uploads (including audio)
        if is_form_data and 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({"response": "❌ No file selected"}), 400
                
            filename = secure_filename(file.filename)
            ext = os.path.splitext(filename)[1].lower()
            
            # Process based on file type
            if ext in SUPPORTED_TEXT_EXTENSIONS.union(SUPPORTED_DOC_EXTENSIONS):
                # Text or document file
                text_content = extract_text_from_file(file)
                store_and_index_text(text_content)
                
                # If there's a query along with the file
                query = request.form.get("query", "").strip()
                if query:
                    return handle_detected_intent(query, session_id)
                else:
                    return jsonify({"response": "📄 File processed successfully. You can now ask questions about its content."})
                    
            elif ext in SUPPORTED_AUDIO_EXTENSIONS:
            # Audio file - handle both .webm from recorder and other audio formats
                try:
                    transcribed_text = process_audio_file(file)
                    # Get the LLM response for the transcribed text
                    response = handle_detected_intent(transcribed_text, session_id)
                    response_data = json.loads(response.get_data(as_text=True))
        
                # Return both the transcription and LLM response
                    return jsonify({
                        "transcribed": transcribed_text,
                        "response": response_data.get("response", "")
                    })
                except Exception as e:
                    print(f"Audio processing error: {str(e)}")
                    return jsonify({
                        "response": "❌ Could not process the audio. Please try again or type your message instead."
                    }), 500
                
            elif ext in SUPPORTED_IMAGE_EXTENSIONS:
                # Image file
                image_description = process_image_file(file)
                return handle_detected_intent(image_description, session_id)
                
            else:
                return jsonify({"response": f"❌ Unsupported file type: {ext}"}), 415
        
        # Handle regular text input (application/json)
        elif request.is_json:
            data = request.get_json()
            if not data or 'query' not in data or not data['query'].strip():
                return jsonify({"response": "Please enter a message."}), 400
                
            user_input = data['query'].strip()
            return handle_detected_intent(user_input, session_id)
        
        else:
            return jsonify({"response": "❌ Unsupported content type. Please use multipart/form-data for files or application/json for text."}), 415
        
    except Exception as e:
        print("Chat endpoint error:", str(e))
        return jsonify({"response": "❌ An error occurred while processing your request."}), 500
    
@app.route("/history", methods=['GET'])
def get_history():
    """Get chat history for current session"""
    session_id = request.cookies.get('session_id') or str(hash(request.remote_addr))
    history = get_session_history(session_id)
    
    messages = []
    for msg in history.messages:
        if isinstance(msg, HumanMessage):
            messages.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            messages.append({"role": "assistant", "content": msg.content})
    
    return jsonify({"history": messages})

@app.route("/clear", methods=['POST'])
def clear_history():
    """Clear chat history for current session"""
    session_id = request.cookies.get('session_id') or str(hash(request.remote_addr))
    if session_id in session_histories:
        del session_histories[session_id]
    if session_id in session_locks:
        del session_locks[session_id]
    return jsonify({"message": "History cleared"})

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8000, debug=True)
