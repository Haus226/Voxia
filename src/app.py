from flask import Flask, request, jsonify, Response
import json, torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv(".env")
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
llm = genai.GenerativeModel('gemini-1.5-flash')
chat = llm.start_chat()

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
def process_audio_or_text():
    print("Processing request...")

    if 'audio' in request.files:
        print("Processing audio...")
        audio_path = "temp.webm"
        request.files['audio'].save(audio_path)
        try:
            result = pipe(audio_path)
            user_query = result["text"]
        except Exception as e:
            print(f"Error processing audio: {e}")
            return jsonify({"error": "An error occurred during audio processing"}), 500

    elif 'text' in request.json:
        print(f"Processing text...")
        user_query = request.json.get('text')
    else:
        return jsonify({"error": "No valid input found, either 'audio' or 'text' is required"}), 400

    try:
        # Send the user query to the generative model
        response = chat.send_message(f'''You are a voice assistant, try to guess what
                                        the user wants based on the text input you received.
                                        Engage in a conversation with them based on their query.
                                        Make sure you link the current query with the chat history.
                                        Here is the user's query: {user_query}''')
        
        print("Assistant Response: ", response.text)
        return Response(json.dumps({"llm_response": response.text, "user_query": user_query},
                                    ensure_ascii=False), 
                                    status=200, mimetype='application/json')
    except Exception as e:
        print(f"Error generating response: {e}")
        return jsonify({"error": "An error occurred while processing the query"}), 500


@app.route('/api/test', methods=['POST'])
def test():
    return jsonify({"transcription": "Testing"}), 200


if __name__ == '__main__':
    app.run(host="192.168.1.17", port=5000, ssl_context=(r"src\certificates\localhost.pem", r"src/certificates/localhost.key"))
