# Voice Assistant

A simple voice assistant built using React.js for the front-end and Python (Flask) for the back-end. It records the user's voice, sends it to the Flask server for speech-to-text conversion, then passes the text to a language model (Gemini) for paraphrasing. The assistant then uses Coqui AI's Text-to-Speech (TTS) API to provide spoken responses.

## Key Features:
- **Voice Input**: Capture voice using the device microphone.
- **Speech-to-Text**: Convert voice to text using a speech recognition service.
- **LLM Integration**: Paraphrase and process the text with a language model (Gemini).
- **Text-to-Speech (TTS)**: Convert the language model's text response into speech using Coqui AI's TTS API, enabling the assistant to "speak."

## Technologies:
- **Frontend**: React.js
- **Backend**: Flask
- **Speech-to-Text**: HuggingFace Whisper API
- **Language Model**: Google Gemini (for paraphrasing)
- **Text-to-Speech (TTS)**: Coqui AI's TTS API
