import React, { useState, useRef } from 'react';

const VoiceAssistant = () => {
    const [response, setResponse] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        setError(null);
        setResponse('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);

            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            setError("Could not access microphone");
            console.error("Microphone access error", err);
        }
    };

    const stopRecording = async () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
            setError("No active recording");
            return;
        }
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        mediaRecorderRef.current.onstop = async () => {
            try {
                // Stop audio tracks
                if (mediaRecorderRef.current.stream) {
                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                }

                // Combine audio chunks into a single Blob
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', audioBlob);
                try {
                    // Use proxy for cross-origin since the ssl certificates for backend
                    // are invalid
                    const response = await fetch('/api/process', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log(result["llm_response"]);
                    console.log(result["stt_response"]);
                    setResponse(result["llm_response"]);
                } catch (error) {
                    console.error("Error fetching data from server:", error.message);
                    alert("Failed to process audio. Please check your server connection.");
                }
            } catch (error) {
                console.error("Processing error:", error);
                setError("Failed to process audio");
            }
        };
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-4">
            <div className="w-full max-w-lg bg-white shadow-lg rounded-lg p-6 text-gray-800">
                <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">Voice Assistant</h1>

                <div className="flex justify-between mb-6">
                    <button
                        onClick={startRecording}
                        disabled={isRecording}
                        className={`w-1/2 mr-2 py-3 rounded-lg transition-colors text-white font-semibold 
              ${isRecording
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-500 hover:bg-green-600'}`}
                    >
                        🎙️ Start Recording
                    </button>
                    <button
                        onClick={stopRecording}
                        disabled={!isRecording}
                        className={`w-1/2 ml-2 py-3 rounded-lg transition-colors text-white font-semibold 
              ${!isRecording
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        🛑 Stop Recording
                    </button>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                        <span className="font-semibold">Error:</span> {error}
                    </div>
                )}

                {response && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border text-gray-800">
                        <h2 className="font-semibold text-lg mb-2 text-indigo-600">AI Response:</h2>
                        <p className="text-gray-700">{response}</p>
                    </div>
                )}

                <p className="text-sm text-center text-gray-500 mt-6">
                    Built with ❤️ and React
                </p>
            </div>
        </div>
    );
};

export default VoiceAssistant;
