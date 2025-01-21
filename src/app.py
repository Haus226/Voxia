from flask import Flask, request, jsonify, Response
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import google.generativeai as genai
from dotenv import load_dotenv
import os, io, base64, json, torch
from TTS.api import TTS
from web_search import search_web

# Initialize Flask app
app = Flask(__name__)

# Load environment variables
load_dotenv(".env")

# Load Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
safe = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_NONE",
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_NONE",
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_NONE",
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_NONE",
    },
]
llm = genai.GenerativeModel('gemini-1.5-flash', 
                            generation_config={"response_mime_type": "application/json",},
                            safety_settings=safe
                            )
chat = llm.start_chat()



# Initialize Speech-To-Text Model
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
stt_id = "openai/whisper-base"
stt = AutoModelForSpeechSeq2Seq.from_pretrained(stt_id, torch_dtype=torch_dtype).to(device)
processor = AutoProcessor.from_pretrained(stt_id)
pipe = pipeline(
    "automatic-speech-recognition",
    model=stt,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    torch_dtype=torch_dtype,
    device=device,
)

tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=True).to(device)
isCloning = False
clonePath = "clone.wav"
speaker = None





@app.route('/api/upload', methods=['POST'])
def set_speaker():
    global isCloning
    global speaker
    isCloning = True
    speaker = None
    if 'audio' in request.files:
        request.files["audio"].save(clonePath)
        return jsonify({"success": "Your voice uploaded successfully"}), 200
    else:
        return jsonify({"error": "No audio file founded"}), 400

@app.route('/api/process', methods=['POST'])
def process_audio_or_text():
    if 'audio' in request.files:
        audio_path = "temp.webm"
        request.files['audio'].save(audio_path)
        try:
            result = pipe(audio_path)
            user_query = result["text"]
            print(user_query)
        except Exception as e:
            print(f"Error processing audio: {e}")
            return jsonify({"error": "An error occurred during audio processing"}), 500
    elif 'text' in request.form:
        user_query = request.form.get("text")
    else:
        return jsonify({"error": "No valid input found, either 'audio' or 'text' is required"}), 400

    speaker = request.form.get("speaker")
    if speaker == "Your Voice":
        speaker = None

    try:
        pre_prompt = f"""Considering the chat history and the current query: "{user_query}",
        generate a concise keyword or phrase most relevant to the query and history for web searching
        if you think it is necessary. If not, enter null value.
        The json should in {{"search_keyword":YOUR_KEYWORD_IN_STRING or null value}} format.
        """
        
        keywords = json.loads(chat.send_message(pre_prompt).text)["search_keyword"]
        print("Keywords : ", keywords)

        # Pop twice since the last and second last which are from user and model
        chat.history.pop()
        chat.history.pop()

        # Determine if search is needed
        if keywords != "null":
            search_results = search_web(keywords)
            print(search_results)
            # Format search results for the prompt, now including detailed content
            search_context = "\n".join([
                f"Source: {result['title']}\nContent: {result['detailed_content']}"
                for result in search_results
            ])
            sources = [{'title': r['title'], 'url': r['link']} for r in search_results]
            
            prompt = f"""You are a voice assistant. Based on the following search results and the user's query, 
                        provide a helpful and informed response. Make your response natural and conversational, 
                        avoid using markdown or emoji.

                        Search Results:
                        {search_context}

                        User Query: {user_query}

                        Previous conversation context should be considered when relevant.
                        You may refer to the search results provided in your response, don't limit yourself to them,
                        you may also use your knowledge to provide a response.
                        The json should in {{"response":YOUR_RESPONSE}} format.
                        """
        else:
            prompt = f"""You are a voice assistant.
                        Provide a natural and conversational response based on your knowledge.
                        Avoid using markdown or emoji.
                        
                        User Query: {user_query}
            
                        Previous conversation context should be considered when relevant.
                        Don't limit yourself,
                        you may also use your knowledge to provide a response.
                        The json should in {{"response":YOUR_RESPONSE}} format.
                        """

        response = chat.send_message(prompt)
        decoded_response = json.loads(response.text)["response"]
        
        print("Assistant Response: ", decoded_response)    
        audio_path = tts.tts_to_file(text=decoded_response, language="en", 
                                    speaker_wav=clonePath if isCloning else None, 
                                    speaker=speaker, file_path="response.wav")
        audio_buffer = io.BytesIO()
        with open(audio_path, "rb") as audio_file:
            audio_buffer.write(audio_file.read())

        audio_buffer.seek(0)
        audio_base64 = base64.b64encode(audio_buffer.read()).decode('utf-8')
        return Response(json.dumps({
            "llm_response": decoded_response, 
            "user_query": user_query, 
            "sources": sources if keywords != "null" else None,
            "audio_base64": audio_base64
        }, ensure_ascii=False), 
        status=200, mimetype='application/json')
    except Exception as e:
        print(f"Error generating response: {e}")
        return jsonify({"error": "An error occurred while processing the query"}), 500

@app.route('/api/test', methods=['POST'])
def test():
    return jsonify({"transcription": "Testing"}), 200

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, ssl_context=(r"src\certificates\localhost.pem", r"src/certificates/localhost.key"))