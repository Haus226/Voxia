# Voxia

## Project Description

This project is a voice assistant application built with React and Flask. It leverages various technologies and APIs to provide speech recognition, text-to-speech, and web search functionalities.

### Project Structure

- **Frontend (React)**
  - The frontend is built using React and styled with Tailwind CSS.
  - The main components include:
    - `src/App.js`: The main entry point of the React application, rendering the `VoiceAssistant` component.
    - `src/VoiceAssistant.js`: The core component handling user interactions, including voice recording, text input, and displaying chat messages.
    - `src/MessageBubbles.js`: A component for rendering individual chat messages, including text, audio playback, and source links.
  - The frontend communicates with the backend via API endpoints to process audio and text inputs.

- **Backend (Flask)**
  - The backend is built using Flask and provides several API endpoints:
    - `/api/upload`: Endpoint for uploading audio files for voice cloning.
    - `/api/process`: Endpoint for processing audio or text inputs and generating responses using a language model.
    - `/api/test`: A test endpoint for verifying the API.
  - The backend integrates with various libraries and services:
    - `transformers` and `TTS`: For speech recognition and text-to-speech functionalities.
    - `google.generativeai`: For generating responses using a language model.
    - `duckduckgo_search`: For performing web searches and scraping content.
  - The backend also includes SSL certificates for secure communication.

### Key Features

- **Voice and Text Input**: Users can interact with the assistant using either voice or text input.
- **Voice Cloning**: Users can upload their voice to clone it for responses.
- **Web Search Integration**: The assistant can perform web searches and provide detailed content from search results.
- **Audio Playback**: The assistant's responses can be played back as audio.
- **Responsive Design**: The application is designed to be responsive and user-friendly on both desktop and mobile devices.

### Getting Started

#### Prerequisites

- Node.js and npm
- Python and pip
- Flask
- Required Python libraries (listed in `requirements.txt`)

#### Installation

1. Clone the repository.
2. Install frontend dependencies:
   ```sh
   npm install
   ```
3. Install backend dependencies:
   ```sh
   pip install -r requirements.txt
   ```
4. Start the backend server:
   ```sh
   python src/app.py
   ```
5. Start the frontend development server:
   ```sh
   npm start
   ```

#### Usage

- Open the application in your browser at `https://localhost:3000`.
- Interact with the voice assistant using the provided interface.