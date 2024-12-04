from flask import Flask, request, jsonify, Response
import json, torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
from flask_cors import CORS

import google.generativeai as genai
from dotenv import load_dotenv
import os
load_dotenv("src/.env")
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
llm = genai.GenerativeModel('gemini-1.5-flash')

# Initialize Flask app
app = Flask(__name__)
# CORS(app)

device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
model_id = "openai/whisper-base"
model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id, torch_dtype=torch_dtype
)
model.to(device)
processor = AutoProcessor.from_pretrained(model_id)
pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    torch_dtype=torch_dtype,
    device=device,
)

@app.route('/api/process', methods=['POST'])
def process_audio():
    print("Processing audio...")
    if 'audio' not in request.files:
        print("No audio found")
        return jsonify({"error": "No audio file found in request"}), 400
    audio_path = "tem.webm"
    request.files['audio'].save(audio_path)

    try:
        result = pipe(audio_path)
        print("Query : ", result["text"])
        response = llm.generate_content(f'''You are a voice assistant, try to guess what
                                        user want after they pass their speech through speech to text model.
                                        Chat with them in the language of text you received.
                                        Prevent any other language for description unless
                                        the user's query specific certain tasks like translation and etc.
                                        Below are the user's query:
                                        {result["text"]}''')
        print("Response : ", response.text)
        return Response(json.dumps({"llm_response":response.text, "stt_response":result["text"]},
                                    ensure_ascii=False), 
                                    status=200, mimetype='application/json')
    except Exception as e:
        print(f"Error processing audio: {e}")
        return jsonify({"error": "An error occurred during processing"}), 500



@app.route('/api/test', methods=['POST'])
def test():
    return jsonify({"transcription": "Testing"}), 200

if __name__ == '__main__':
    app.run(host="192.168.1.17", port=5000, ssl_context=(r"src\certificates\localhost.pem", r"src/certificates/localhost.key"))
