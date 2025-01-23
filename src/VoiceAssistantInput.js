import React from 'react';
import './style/animations.css';

const VoiceAssistantInput = ({
    userInput,
    setUserInput,
    onSubmit,
    disabled,
    stage = "Hello World!"
}) => {

    // Define stage styles and messages
    const stageConfigs = {
        "Hello World!": {
            bgColor: "bg-gray-50",
            textColor: "text-gray-500", // Changed from placeholderColor
            borderColor: "border-gray-300",
            dotColor: "text-gray-400"
        },
        "Processing": {
            bgColor: "bg-blue-50",
            textColor: "text-blue-500", // Changed from placeholderColor
            borderColor: "border-blue-400",
            dotColor: "text-blue-500"
        },
        "Searching": {
            bgColor: "bg-purple-50",
            textColor: "text-purple-500", // Changed from placeholderColor
            borderColor: "border-purple-400",
            dotColor: "text-purple-500"
        },
        "Thinking": {
            bgColor: "bg-amber-50",
            textColor: "text-amber-500", // Changed from placeholderColor
            borderColor: "border-amber-400",
            dotColor: "text-amber-500"
        },
        "Generating Audio": {
            bgColor: "bg-green-50",
            textColor: "text-green-500", // Changed from placeholderColor
            borderColor: "border-green-400",
            dotColor: "text-green-500"
        }
    };



    const currentStage = stageConfigs[stage] || stageConfigs["Hello World!"];

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !disabled && userInput.trim() !== '') {
            e.preventDefault();
            onSubmit(e);
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={disabled}
                className={`w-full ${currentStage.bgColor} text-gray-900 
                rounded-lg px-4 py-2 border ${currentStage.borderColor} 
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                focus:outline-none transition-colors duration-200
                ${disabled ? 'cursor-not-allowed' : 'cursor-text'}`}
            />
            {!userInput && (
                <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
                    <span className={`${currentStage.textColor} inline-flex items-center gap-2 animate-fadeInOut`}>
                            {stage}
                            {disabled && (
                                <>
                                    <span className={`w-1 h-1 rounded-full bg-current ${currentStage.textColor} animate-bounce`} />
                                    <span className={`w-1 h-1 rounded-full bg-current ${currentStage.textColor} animate-bounce delay-100`} />
                                    <span className={`w-1 h-1 rounded-full bg-current ${currentStage.textColor} animate-bounce delay-200`} />
                                </>
                            )}
                        </span>
                    </div>
            )}
        </div>
    );
};

export default VoiceAssistantInput;