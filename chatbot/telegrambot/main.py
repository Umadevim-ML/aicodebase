import json
import re
import os
import base64
from typing import Dict, List, Optional
from threading import Lock
from tempfile import NamedTemporaryFile
import mimetypes

from PyPDF2 import PdfReader
import docx
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory

from telegram import Update, Voice, PhotoSize, Document
from telegram.ext import (
    ApplicationBuilder,
    ContextTypes,
    MessageHandler,
    CommandHandler,
    filters
)
import groq

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

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
SUPPORTED_AUDIO_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.ogg', '.oga', '.webm'}
SUPPORTED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp'}

def get_session_lock(chat_id: str) -> Lock:
    """Get or create processing lock for a chat"""
    if chat_id not in session_locks:
        session_locks[chat_id] = Lock()
    return session_locks[chat_id]

def get_session_history(chat_id: str) -> ChatMessageHistory:
    """Get or create chat history for a chat"""
    if chat_id not in session_histories:
        session_histories[chat_id] = ChatMessageHistory()
    return session_histories[chat_id]

def get_conversation_chain(chat_id: str, intent: str) -> LLMChain:
    """Create appropriate LangChain chain based on intent"""
    history = get_session_history(chat_id)
    
    # Common components
    memory = ConversationBufferMemory(
        return_messages=True,
        memory_key="history",
        chat_memory=history
    )
    
    # Base prompt template
    if intent == "greeting":
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a friendly AI assistant. Respond to greetings briefly and concisely in 1-2 sentences."),
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

async def extract_text_from_file(file_path: str, file_extension: str) -> str:
    """Extract text from various file types"""
    try:
        if file_extension in SUPPORTED_TEXT_EXTENSIONS:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        elif file_extension == '.pdf':
            reader = PdfReader(file_path)
            return "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
        elif file_extension == '.docx':
            doc = docx.Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
    except Exception as e:
        print(f"Error extracting text from {file_path}: {str(e)}")
        raise

async def process_audio_file(file_path: str) -> str:
    """Transcribe audio file using Groq's Whisper API"""
    try:
        with open(file_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=(file_path, audio_file.read()),
                model="whisper-large-v3-turbo",
                response_format="text",
                language="en",
            )
            return str(transcription)
    except Exception as e:
        print(f"Audio transcription error: {str(e)}")
        raise

async def process_image_file(file_path: str) -> str:
    """Extract text/description from image using Llama-4-Scout"""
    try:
        with open(file_path, "rb") as img_file:
            image_data = base64.b64encode(img_file.read()).decode('utf-8')
            file_extension = os.path.splitext(file_path)[1].lower()
            
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
                                "image_url": f"data:image/{file_extension[1:]};base64,{image_data}"
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

async def handle_detected_intent(text: str, chat_id: str) -> str:
    """Handle the detected intent and generate appropriate response"""
    sub_queries = detect_intent_llm(text)
    print("Detected sub-queries:", sub_queries)

    responses = []
    
    for item in sub_queries:
        query = item["query"]
        intent = item["intent"]
        print(f"Processing intent '{intent}' for query: {query}")

        # Get session lock to ensure sequential processing
        session_lock = get_session_lock(chat_id)
        with session_lock:
            # Get appropriate chain
            chain = get_conversation_chain(chat_id, intent)
            
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
    
    return "\n\n".join(responses)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a message when the command /start is issued."""
    await update.message.reply_text(
        "👋 Hi! I'm your Coding Assistant bot. I can help with:\n"
        "- Explaining code concepts\n"
        "- Generating code samples\n"
        "- Debugging issues\n"
        "- Optimizing code\n"
        "- Reviewing code\n"
        "- Teaching programming\n\n"
        "You can send me:\n"
        "- Text messages with your questions\n"
        "- Code files (.py, .js, etc.) to analyze\n"
        "- PDF/DOCX documents to extract text from\n"
        "- Voice messages with your questions\n"
        "- Images containing code/text to analyze\n\n"
        "Try sending me something!"
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a message when the command /help is issued."""
    await update.message.reply_text(
        "🤖 Coding Assistant Bot Help:\n\n"
        "Available commands:\n"
        "/start - Welcome message\n"
        "/help - This help message\n"
        "/clear - Clear conversation history\n\n"
        "What I can do:\n"
        "• Answer programming questions\n"
        "• Explain code concepts\n"
        "• Generate code samples\n"
        "• Debug code issues\n"
        "• Optimize existing code\n"
        "• Review your code\n"
        "• Teach programming topics\n\n"
        "Supported file types:\n"
        "• Code files: .py, .js, .java, etc.\n"
        "• Documents: .pdf, .docx\n"
        "• Audio: voice messages, .mp3, .wav\n"
        "• Images: .jpg, .png (for text/code analysis)"
    )

async def clear_history(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Clear the chat history for this chat."""
    chat_id = str(update.effective_chat.id)
    if chat_id in session_histories:
        del session_histories[chat_id]
    if chat_id in session_locks:
        del session_locks[chat_id]
    await update.message.reply_text("🗑️ Conversation history cleared!")

async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming text messages."""
    chat_id = str(update.effective_chat.id)
    user_input = update.message.text
    
    if not user_input.strip():
        await update.message.reply_text("Please enter a message.")
        return
    
    try:
        # Send "typing" action
        await context.bot.send_chat_action(
            chat_id=update.effective_chat.id,
            action="typing"
        )
        
        response = await handle_detected_intent(user_input, chat_id)
        await update.message.reply_text(response)
    except Exception as e:
        print("Error processing text message:", e)
        await update.message.reply_text("❌ An error occurred while processing your message.")

async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle document files (code files, PDFs, DOCX)."""
    chat_id = str(update.effective_chat.id)
    document = update.message.document
    
    # Get file extension
    file_extension = os.path.splitext(document.file_name)[1].lower()
    
    if file_extension not in SUPPORTED_TEXT_EXTENSIONS.union(SUPPORTED_DOC_EXTENSIONS):
        await update.message.reply_text(
            f"❌ Unsupported file type: {file_extension}\n"
            f"Supported document types: {', '.join(SUPPORTED_TEXT_EXTENSIONS.union(SUPPORTED_DOC_EXTENSIONS))}"
        )
        return
    
    try:
        # Send "typing" action
        await context.bot.send_chat_action(
            chat_id=update.effective_chat.id,
            action="typing"
        )
        
        # Download the file
        file = await context.bot.get_file(document.file_id)
        with NamedTemporaryFile(suffix=file_extension) as temp_file:
            await file.download_to_drive(temp_file.name)
            
            # Process the file
            text_content = await extract_text_from_file(temp_file.name, file_extension)
            store_and_index_text(text_content)
            
            # Check if there's a caption with a question
            if update.message.caption:
                response = await handle_detected_intent(update.message.caption, chat_id)
                await update.message.reply_text(response)
            else:
                await update.message.reply_text(
                    "📄 File processed successfully. You can now ask questions about its content."
                )
    except Exception as e:
        print("Error processing document:", e)
        await update.message.reply_text("❌ Failed to process the document. Please try again.")

async def handle_voice_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle voice messages by transcribing them."""
    chat_id = str(update.effective_chat.id)
    voice = update.message.voice
    
    try:
        # Send "typing" action
        await context.bot.send_chat_action(
            chat_id=update.effective_chat.id,
            action="typing"
        )
        
        # Download the voice message
        file = await context.bot.get_file(voice.file_id)
        with NamedTemporaryFile(suffix='.ogg') as temp_file:
            await file.download_to_drive(temp_file.name)
            
            # Transcribe the audio
            transcribed_text = await process_audio_file(temp_file.name)
            
            # Get the LLM response
            response = await handle_detected_intent(transcribed_text, chat_id)
            
            # Send both transcription and response
            await update.message.reply_text(
                f"🎤 Transcribed:\n{transcribed_text}\n\n"
                f"💡 Response:\n{response}"
            )
    except Exception as e:
        print("Error processing voice message:", e)
        await update.message.reply_text("❌ Could not process the voice message. Please try again.")

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle photos by analyzing them for text/code."""
    chat_id = str(update.effective_chat.id)
    photo = update.message.photo[-1]  # Get highest resolution photo
    
    try:
        # Send "typing" action
        await context.bot.send_chat_action(
            chat_id=update.effective_chat.id,
            action="typing"
        )
        
        # Download the photo
        file = await context.bot.get_file(photo.file_id)
        with NamedTemporaryFile(suffix='.jpg') as temp_file:
            await file.download_to_drive(temp_file.name)
            
            # Process the image
            image_description = await process_image_file(temp_file.name)
            
            # Check if there's a caption with additional context
            if update.message.caption:
                full_query = f"{update.message.caption}\n\nImage content:\n{image_description}"
            else:
                full_query = f"Based on this image:\n{image_description}"
            
            # Get the LLM response
            response = await handle_detected_intent(full_query, chat_id)
            
            await update.message.reply_text(response)
    except Exception as e:
        print("Error processing photo:", e)
        await update.message.reply_text("❌ Could not process the image. Please try again.")

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Log errors and send a generic message to the user."""
    print(f"Update {update} caused error {context.error}")
    if update.effective_message:
        await update.effective_message.reply_text(
            "❌ An unexpected error occurred. Please try again later."
        )

def main():
    """Start the bot."""
    # Create the Application
    application = ApplicationBuilder().token(os.getenv("TELEGRAM_BOT_TOKEN")).build()
    
    # Add command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("clear", clear_history))
    
    # Add message handlers
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message))
    application.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    application.add_handler(MessageHandler(filters.VOICE, handle_voice_message))
    application.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    
    # Add error handler
    application.add_error_handler(error_handler)
    
    # Run the bot
    print("Bot is running...")
    application.run_polling()

if __name__ == "__main__":
    main()