import os
import json
import re
import base64
from dotenv import load_dotenv
import tempfile
from telegram import Update, Voice, PhotoSize
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, CommandHandler, filters
import groq
from PyPDF2 import PdfReader
import docx
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import HumanMessage, AIMessage
from collections import defaultdict

load_dotenv()

# --- Setup ---
groq_api_key = os.getenv("GROQ_API_KEY")
client = groq.Client(api_key=groq_api_key)

# --- Document Indexing Setup ---
embedding_dim = 384  # Dimension of embeddings
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')  
index = faiss.IndexFlatL2(embedding_dim)
id_to_text = {}
next_id = 0

# --- Chat History Setup ---
store = defaultdict(ChatMessageHistory)

def get_session_history(session_id: str) -> ChatMessageHistory:
    return store[session_id]

# --- Utilities ---
def clean_response(text):
    text = re.sub(r'```(.*?)```', r'\1', text, flags=re.DOTALL)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    return text.strip()

def transcribe_audio_to_text(audio_path):
    with open(audio_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(audio_path, file.read()),
            model="whisper-large-v3-turbo",
            response_format="verbose_json",
            language="en"
        )
    return transcription.text

def detect_coding_intent(text):
    if len(text.strip()) < 3:
        return {"is_coding": False, "request_type": None, "language": None}
    prompt = [
        {"role": "system", "content": (
            "Analyze message strictly for:\n"
            "1. Coding intent (True/False)\n"
            "2. Request type (only classify if coding=True):\n"
            "   - 'question': Technical/programming question\n"
            "   - 'modify': Request to change/fix code\n"
            "   - 'explain': Request for code explanation\n"
            "3. Language: Detected programming language or None\n"
            "Rules:\n"
            "- Greetings: is_coding=False, request_type=None\n"
            "- Non-tech: is_coding=False\n"
            "- Respond with JSON only, no commentary\n"
            "Example output:\n"
            "{\"is_coding\":true,\"request_type\":\"modify\",\"language\":\"Python\"}"
        )},
        {"role": "user", "content": text}
    ]
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=prompt,
            response_format={"type": "json_object"},
            temperature=0.1
        )
        result = json.loads(response.choices[0].message.content)
        return {
            "is_coding": bool(result.get("is_coding", False)),
            "request_type": result.get("request_type") if result.get("is_coding") else None,
            "language": result.get("language") if result.get("is_coding") else None
        }
    except Exception as e:
        print(f"Intent detection error: {e}")
        return {"is_coding": False, "request_type": None, "language": None}

# --- Image and Document Handling ---
async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    photo = update.message.photo[-1]  # Get highest resolution photo
    file = await context.bot.get_file(photo.file_id)
    
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        await file.download_to_drive(tmp.name)
        with open(tmp.name, "rb") as image_file:
            caption = update.message.caption or "Extract any code from this image"
            response = handle_image_query(image_file, caption)
    
    os.remove(tmp.name)
    await update.message.reply_text(response)

def handle_image_query(image_file, query=None):
    image_bytes = image_file.read()
    mime_type = "image/jpeg"  # Telegram sends as JPEG
    
    # Encode image to base64
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    # Create image payload
    image_payload = {
        "type": "image_url",
        "image_url": {
            "url": f"data:{mime_type};base64,{base64_image}"
        }
    }

    # Default to extracting code
    chat_prompt = query if query else "Extract all code from this image. Return only the code with proper formatting."

    # Send to llama-3.2-11b-vision-preview via Groq client
    response = client.chat.completions.create(
        model="llama-3.2-11b-vision-preview",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": chat_prompt},
                    image_payload
                ]
            }
        ]
    )
    return response.choices[0].message.content

async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    MAX_SIZE = 5 * 1024 * 1024  
    document = update.message.document
    if document.file_size > MAX_SIZE:
        await update.message.reply_text("❌ File too large (max 5MB)")
        return
    
    file = await context.bot.get_file(document.file_id)
    
    with tempfile.NamedTemporaryFile(suffix=document.file_name, delete=False) as tmp:
        await file.download_to_drive(tmp.name)
        try:
            text = extract_text(tmp)
            store_file_and_index(tmp)
            response = "📄 Document processed and indexed! You can now ask questions about its content."
        except ValueError as e:
            response = f"❌ Error: {str(e)}"
        except Exception as e:
            response = "❌ An error occurred while processing the document."
            print("Document processing error:", e)
    
    os.remove(tmp.name)
    await update.message.reply_text(response)

def extract_text(file):
    filename = file.name.lower()
    if filename.endswith(".pdf"):
        reader = PdfReader(file.name)
        return "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
    elif filename.endswith(".docx"):
        doc = docx.Document(file.name)
        return "\n".join([para.text for para in doc.paragraphs])
    elif filename.endswith(".txt"):
        with open(file.name, "r") as f:
            return f.read()
    else:
        raise ValueError("Unsupported file type")

def store_file_and_index(file):
    global next_id
    text = extract_text(file)
    chunks = [text[i:i+500] for i in range(0, len(text), 500)]

    for chunk in chunks:
        embedding = embedding_model.encode(chunk, normalize_embeddings=True).astype("float32")
        index.add(np.array([embedding]))
        id_to_text[next_id] = chunk
        next_id += 1

def generate_coding_response(query, context=None, chat_history=None, intent=None):
    # Prepare message history
    messages = [{
        "role": "system", 
        "content": (
            "You are a concise coding assistant. Rules:\n"
            "1. ONLY respond to programming questions (code/questions/explanations)\n"
            "2. Keep responses MINIMAL (1-5 sentences max for explanations, code-only when possible)\n"
            "3. For greetings: Just say 'Hello. Send your code/question.' (5 words max)\n"
            "4. For non-coding queries: 'Code questions only.' (3 words)\n"
            "5. Code modifications: Return ONLY the improved code with brief comments\n"
            "6. Explanations: One clear example maximum\n"
        )
    }]
    
    if chat_history:
        for msg in chat_history.messages:
            if isinstance(msg, HumanMessage):
                messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                messages.append({"role": "assistant", "content": msg.content})
    
    if context:
        messages.append({
            "role": "system",
            "content": f"Context from uploaded documents:\n{context}"
        })
    
    # Add intent information if available
    if intent and intent["is_coding"]:
        if intent["language"]:
            messages.append({
                "role": "system",
                "content": f"User is working with {intent['language']} code."
            })
        if intent["request_type"]:
            messages.append({
                "role": "system",
                "content": f"Request type: {intent['request_type']}."
            })
    
    messages.append({"role": "user", "content": query})
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.3,
            max_tokens=500
        )
        return clean_response(response.choices[0].message.content)
    except Exception as e:
        print(f"Generation error: {e}")
        return "Error generating response"

def retrieve_relevant_text(query, top_k=5):
    query_embedding = embedding_model.encode(query, normalize_embeddings=True).reshape(1, -1).astype("float32")
    distances, indices = index.search(query_embedding, top_k)

    retrieved = [id_to_text.get(i, "") for i in indices[0] if i >= 0]
    return "\n".join(retrieved) if retrieved else None

async def process_input(update: Update, context: ContextTypes.DEFAULT_TYPE, user_input: str):
    # Handle greetings immediately
    if user_input.lower().strip() in ['hi', 'hello', 'hey']:
        await update.message.reply_text("Hello. I am a coding bot. Ask Coding questions only.")
        return
    
    chat_id = str(update.effective_chat.id)
    chat_history = get_session_history(chat_id)
    intent = detect_coding_intent(user_input)
    
    if not intent["is_coding"]:
        await update.message.reply_text("I am a coding bot. Ask Coding questions only.")
        return
    
    chat_history.add_user_message(user_input)
    context_text = retrieve_relevant_text(user_input)
    
    try:
        response = generate_coding_response(
            query=user_input,
            context=context_text,
            chat_history=chat_history,
            intent=intent
        )
        chat_history.add_ai_message(response)
        await update.message.reply_text(response)
    except Exception as e:
        print(f"Processing error: {e}")
        await update.message.reply_text("Error processing request")

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await process_input(update, context, update.message.text)

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    voice: Voice = update.message.voice
    with tempfile.NamedTemporaryFile(delete=False, suffix=".ogg") as tmp:
        file = await context.bot.get_file(voice.file_id)
        await file.download_to_drive(tmp.name)

    user_input = transcribe_audio_to_text(tmp.name)
    os.remove(tmp.name)
    await process_input(update, context, user_input)

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Hi! I'm your expert Coding Assistant bot.\n\n"
        "I can help you with:\n"
        "- Answering programming questions\n"
        "- Modifying/improving your code\n"
        "- Explaining coding concepts\n"
        "- Analyzing code from images/documents\n\n"
        "Just send me your code or question!"
    )

def main():
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    app = ApplicationBuilder().token(telegram_token).build()
    
    # Add handlers
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_text))
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    app.add_handler(MessageHandler(filters.PHOTO, handle_image))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))

    print("✅ Coding Assistant bot running...")
    app.run_polling()

if __name__ == "__main__":
    main()