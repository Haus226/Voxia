import React, { useState, useRef } from 'react';

const VoiceAssistant = () => {
    const [messages, setMessages] = useState([]); // Array to store the chat history
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);
    const [userInput, setUserInput] = useState(''); // State for typed input
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const chatContainerRef = useRef(null);

    // Start recording audio for voice input
    const startRecording = async () => {
        setError(null);

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

    // Stop the recording and process the audio
    const stopRecording = async () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
            setError("No active recording");
            return;
        }
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        mediaRecorderRef.current.onstop = async () => {
            try {
                if (mediaRecorderRef.current.stream) {
                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                }

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', audioBlob);
                try {
                    const response = await fetch('/api/process', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }

                    const result = await response.json();
                    const userMessage = { text: result["user_query"], sender: 'user' };
                    const assistantMessage = { text: result["llm_response"], sender: 'assistant' };

                    // Add the new messages to the chat history
                    setMessages((prevMessages) => [...prevMessages, userMessage, assistantMessage]);
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

    // Handle text input submission
    const handleTextSubmit = async (e) => {
        
        e.preventDefault();
        if (userInput.trim() === '') return; // Ignore empty input

        const userMessage = { text: userInput, sender: 'user' };
        setUserInput("");
        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                body: JSON.stringify({ text: userInput }),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            const assistantMessage = { text: result["llm_response"], sender: 'assistant' };

            // Add the assistant's response to the chat history
            setMessages((prevMessages) => [...prevMessages, userMessage, assistantMessage]);
        } catch (error) {
            console.error("Error fetching data from server:", error.message);
            alert("Failed to process text. Please check your server connection.");
        }

    };

    // Auto scroll to the bottom whenever messages change
    React.useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    return (


        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-8">
            <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-8 text-gray-800">
                <h1 className="text-4xl font-bold mb-8 text-center text-indigo-600">Voice Assistant</h1>
                {/* Chat container */}
                <div
                    ref={chatContainerRef}
                    className="h-72 overflow-y-auto flex flex-col space-y-4 mb-6 p-4 bg-gray-100 rounded-lg"
                >
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-xs p-3 rounded-lg text-white ${message.sender === 'user' ? 'bg-green-500' : 'bg-indigo-500'}`}
                            >
                                <p>{message.text}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Buttons to control recording */}
                <div className="flex justify-between mb-6">
                    <button
                        onClick={startRecording}
                        disabled={isRecording}
                        className={`w-1/2 mr-2 py-3 rounded-lg transition-colors text-white font-semibold 
                        ${isRecording ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                        🎙️ Start Recording
                    </button>
                    <button
                        onClick={stopRecording}
                        disabled={!isRecording}
                        className={`w-1/2 ml-2 py-3 rounded-lg transition-colors text-white font-semibold 
                        ${!isRecording ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        🛑 Stop Recording
                    </button>
                </div>

                {/* Text input for typing messages */}
                <form onSubmit={handleTextSubmit} className="mb-6">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full p-3 rounded-lg text-gray-800"
                    />
                    <button
                        type="submit"
                        disabled={userInput.trim() === ''}
                        className={`w-full mt-2 py-3 rounded-lg text-white 
                         ${userInput.trim() === '' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                        Send Message
                    </button>
                </form>

                {/* Error message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                        <span className="font-semibold">Error:</span> {error}
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
