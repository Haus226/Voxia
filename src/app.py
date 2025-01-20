from flask import Flask, request, jsonify, Response
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import google.generativeai as genai
from dotenv import load_dotenv
import os, io, base64, json, torch
from TTS.api import TTS


# Load environment variables
load_dotenv(".env")

# Load Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
llm = genai.GenerativeModel('gemini-2.0-flash-exp')
chat = llm.start_chat()

# Initialize Flask app
app = Flask(__name__)

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
        response = chat.send_message(f'''You are a voice assistant, try to guess what
                                        the user wants based on the text input you received.
                                        Engage in a conversation with them based on their query.
                                        Make sure you link the current query with the chat history and
                                        provide short and precise response, avoid use of markdown syntax and emoji.
                                        Here is the user's query: {user_query}''')
        
        print("Assistant Response: ", response.text)    
        audio_path = tts.tts_to_file(text=response.text, language="en", 
                                    speaker_wav=clonePath if isCloning else None, 
                                    speaker=speaker)
        audio_buffer = io.BytesIO()
        with open(audio_path, "rb") as audio_file:
            audio_buffer.write(audio_file.read())

        audio_buffer.seek(0)
        audio_base64 = base64.b64encode(audio_buffer.read()).decode('utf-8')
        return Response(json.dumps({"llm_response": response.text, "user_query": user_query, 
                                    "audio_base64": audio_base64},
                                    ensure_ascii=False), 
                                    status=200, mimetype='application/json')
    except Exception as e:
        print(f"Error generating response: {e}")
        return jsonify({"error": "An error occurred while processing the query"}), 500


@app.route('/api/test', methods=['POST'])
def test():
    return jsonify({"transcription": "Testing"}), 200


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, ssl_context=(r"src\certificates\localhost.pem", r"src/certificates/localhost.key"))
