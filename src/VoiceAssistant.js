import React, { useState, useRef, useEffect} from 'react';
import MessageBubble from './MessageBubbles';
import VoiceAssistantInput from './VoiceAssistantInput';


// Due to proxy, the other device must use host of this proxy
const VoiceAssistant = () => {
    const preventTouchCallout = {
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation'
    };

    const [messages, setMessages] = useState([]); // Chat history
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);
    const [userInput, setUserInput] = useState(''); // Typed input state
    const [uploading, setUploading] = useState(false); // State for upload process
    const [selectedSpeaker, setSelectedSpeaker] = useState('Claribel Dervla'); // Added state for speaker selection
    const speakers = [
        "Your Voice",
        "Claribel Dervla", "Daisy Studious", "Gracie Wise", "Tammie Ema", "Alison Dietlinde",
        "Ana Florence", "Annmarie Nele", "Asya Anara", "Brenda Stern", "Gitta Nikolina",
        "Henriette Usha", "Sofia Hellen", "Tammy Grit", "Tanja Adelina", "Vjollca Johnnie",
        "Andrew Chipper", "Badr Odhiambo", "Dionisio Schuyler", "Royston Min", "Viktor Eka",
        "Abrahan Mack", "Adde Michal", "Baldur Sanjin", "Craig Gutsy", "Damien Black",
        "Gilberto Mathias", "Ilkin Urbano", "Kazuhiko Atallah", "Ludvig Milivoj", "Suad Qasim",
        "Torcull Diarmuid", "Viktor Menelaos", "Zacharie Aimilios", "Nova Hogarth", "Maja Ruoho",
        "Uta Obando", "Lidiya Szekeres", "Chandra MacFarland", "Szofi Granger", "Camilla Holmström",
        "Lilya Stainthorpe", "Zofija Kendrick", "Narelle Moon", "Barbora MacLean", "Alexandra Hisakawa",
        "Alma María", "Rosemary Okafor", "Ige Behringer", "Filip Traverse", "Damjan Chapman",
        "Wulf Carlevaro", "Aaron Dreschner", "Kumar Dahl", "Eugenio Mataracı", "Ferran Simen",
        "Xavier Hayasaka", "Luis Moray", "Marcos Rudaski",
        ]; // List of speakers
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const chatContainerRef = useRef(null);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [stage, setStage] = useState("Hello World!");

    const handleSpeakerChange = (e) => {
        setSelectedSpeaker(e.target.value);
        if (e.target.value !== "Your Voice") {
            setError(null); // Clear any errors when switching speakers
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('audio', file);

        setUploading(true);
        setError(null);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            setSelectedSpeaker("Your Voice");
            alert("Voice successfully uploaded for cloning!"); // Notify user
        } catch (error) {
            console.error("Error uploading file:", error);
            setError("Failed to upload the file. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const fetchStage = async () => {
        try {
            const response = await fetch('/api/stage');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            setStage(data.stage);
        } catch (error) {
            console.error("Error fetching stage:", error);
        }
    };

    useEffect(() => {
        const interval = setInterval(fetchStage, 1000); // Poll the stage endpoint every second
        return () => clearInterval(interval);
    }, []);

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
                    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
                }
                // If no sound, may due to incompactible of audio format
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
                let formData = new FormData();
                formData.append("audio", audioBlob);
                formData.append("speaker", selectedSpeaker);


                // Save user's voice recording in the chat
                const audioURL = URL.createObjectURL(audioBlob);
                const userMessage = {
                    text: "", // Placeholder for voice message text
                    sender: 'user',
                    audioURL, // Store the URL of the user's voice recording
                };
                const response = await fetch('/api/process', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const result = await response.json();
                const assistantMessage = {
                    text: result.llm_response,
                    sender: 'assistant',
                    sources: result.sources, // Save the sources in the message
                    audioBase64: result.audio_base64, // Save assistant's audio in the message
                };

                // Add the assistant's response to the chat
                userMessage["text"] = result["user_query"];
                setMessages((prevMessages) => [...prevMessages, userMessage, assistantMessage]);
            } catch (error) {
                console.error("Error processing audio:", error);
                setError("Failed to process audio");
            }
        };
    };

    const handleTextSubmit = async (e) => {
        setError(null);
        e.preventDefault();
        if (userInput.trim() === '') return;

        setStage("Processing");
        const userMessage = { text: userInput, sender: 'user' };
        setUserInput("");
        setMessages((prevMessages) => [...prevMessages, userMessage]);

        try {
            let formData = new FormData();
            formData.append("text", userInput);
            formData.append("speaker", selectedSpeaker);

            const response = await fetch('/api/process', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            setStage("Generating");
            const result = await response.json();
            const assistantMessage = {
                text: result.llm_response,
                sender: 'assistant',
                sources: result.sources,
                audioBase64: result.audio_base64,
            };

            setMessages((prevMessages) => [...prevMessages, assistantMessage]);
            setStage("Hello World!");
        } catch (error) {
            console.error("Error fetching data from server:", error.message);
            setError("Failed to process text. Please check your server connection.");
            setStage("Hello World!");
        }
    };

    const touchProps = isTouchDevice ? {
        onTouchStart: (startRecording),
        onTouchEnd: (stopRecording)
    } : {
        onClick: () => {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
            setIsRecording(!isRecording); // Toggle the recording state
        }
    };

    // Auto scroll to the bottom whenever messages change
    React.useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    React.useEffect(() => {
        // Check for touch support in multiple ways
        const isTouch = (
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0)
        );
        setIsTouchDevice(isTouch);
    }, []);
    

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-8">
            <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-6 text-gray-800">
                <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">Voxia</h1>

                {/* Speaker selection - made more compact */}
                <div className="mb-4">
                <label className="block text-base font-semibold text-indigo-700 mb-1">
                    Select Voice
                </label>
                <div className="relative">
                    <select
                        value={selectedSpeaker}
                        onChange={handleSpeakerChange}
                        className="w-full p-2 text-gray-800 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm appearance-none"
                        // Add size attribute to show multiple options and make scrollable
                        size={1}
                        style={{
                            // Custom styles for dropdown when opened
                            "--tw-scrollbar-track": "transparent",
                            "--tw-scrollbar-thumb": "#cbd5e0",
                        }}
                    >
                        <option value="" disabled>Select a speaker</option>
                        {speakers.map((speaker) => (
                            <option
                                key={speaker}
                                value={speaker}
                                className="py-2 px-4 hover:bg-indigo-50"
                            >
                                {speaker}
                            </option>
                        ))}
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                    </div>
                </div>
            </div>

                {/* File Upload - made more compact */}
                {selectedSpeaker === "Your Voice" && (
                    <div className="mb-4">
                        <label className="block text-base font-semibold text-indigo-700 mb-1">
                            Upload Your Voice
                        </label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="block w-full p-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            {uploading && (
                                <span className="text-indigo-600 text-sm animate-pulse">
                                    Uploading...
                                </span>
                            )}
                        </div>
                        {(error && uploading) && (
                            <p className="mt-1 text-sm text-red-500">{error}</p>
                        )}
                    </div>
                )}

                {/* Chat container - made taller */}
                <div
                    ref={chatContainerRef}
                    className="h-96 overflow-y-auto flex flex-col space-y-4 mb-4 p-4 bg-gray-50 rounded-lg"
                >
                    {messages.map((message, index) => (
                        <MessageBubble
                            key={index}
                            message={message}
                        />
                    ))}
                    
                </div>


                {/* Input form - styled to match overall theme */}
                <form onSubmit={handleTextSubmit} className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <VoiceAssistantInput
                                userInput={userInput}
                                setUserInput={setUserInput}
                                onSubmit={handleTextSubmit}
                                disabled={stage !== "Hello World!"}
                                stage={stage}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={userInput.trim() === ''}
                            className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors ${userInput.trim() === ''
                                    ? "bg-gray-50 border-gray-300 text-gray-300 cursor-not-allowed"
                                    : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                                }`}
                            title="Send Message"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                className="w-5 h-5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                                />
                            </svg>
                        </button>

                        <button
                            type="button"
                            style={preventTouchCallout}
                            {...touchProps}
                            disabled={stage !== "Hello World!"}  // Disable when not in initial state
                            className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors 
        ${isRecording
                                    ? "bg-red-50 border-red-500 text-red-500 hover:bg-red-100"
                                    : stage !== "Hello World!"
                                        ? "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"  // Disabled state
                                        : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                                }`}
                            title={
                                stage !== "Hello World!"
                                    ? "Recording disabled while processing"
                                    : isRecording
                                        ? "Recording..."
                                        : "Hold to Record"
                            }
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                className="w-5 h-5"
                            >
                                <path d="M12 1c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2s2-.9 2-2V3c0-1.1-.9-2-2-2zm-6 8c-.6 0-1 .4-1 1v2c0 3.1 2.5 5.6 5.6 5.9V21H8c-.6 0-1 .4-1 1s.4 1 1 1h8c.6 0 1-.4 1-1s-.4-1-1-1h-2.6v-3.1c3.1-.3 5.6-2.8 5.6-5.9v-2c0-.6-.4-1-1-1s-1 .4-1 1v2c0 2.2-1.8 4-4 4s-4-1.8-4-4v-2c0-.6-.4-1-1-1z" />
                            </svg>
                        </button>
                    </div>


                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                            <span className="font-semibold">Error:</span> {error}
                        </div>
                    )}

                </form>

                <p className="text-xs text-center text-gray-500 mt-4">
                    Built with ❤️ and React
                </p>
            </div>
        </div>
    );
};


export default VoiceAssistant;