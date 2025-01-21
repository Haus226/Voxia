import React from 'react';

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
            placeholderColor: "placeholder-gray-400",
            borderColor: "border-gray-300",
            dotColor: "text-gray-400"
        },
        "Processing": {
            bgColor: "bg-blue-50",
            placeholderColor: "placeholder-blue-500",
            borderColor: "border-blue-400",
            dotColor: "text-blue-500"
        },
        "Searching": {
            bgColor: "bg-purple-50",
            placeholderColor: "placeholder-purple-500",
            borderColor: "border-purple-400",
            dotColor: "text-purple-500"
        },
        "Thinking": {
            bgColor: "bg-amber-50",
            placeholderColor: "placeholder-amber-500",
            borderColor: "border-amber-400",
            dotColor: "text-amber-500"
        },
        "Generating Audio": {
            bgColor: "bg-green-50",
            placeholderColor: "placeholder-green-500",
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
                placeholder={stage}
                className={`w-full ${currentStage.bgColor} text-gray-900 
                    ${currentStage.placeholderColor}
                    rounded-lg px-4 py-2 border ${currentStage.borderColor} 
                    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                    focus:outline-none transition-colors duration-200
                    ${disabled ? 'cursor-not-allowed' : 'cursor-text'}`}
            />
            {disabled && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`flex items-center gap-2 ${currentStage.dotColor}`}>
                        <div className="w-2 h-2 rounded-full animate-bounce"
                            style={{
                                backgroundColor: 'currentColor',
                                animationDelay: '0ms'
                            }}
                        />
                        <div className="w-2 h-2 rounded-full animate-bounce"
                            style={{
                                backgroundColor: 'currentColor',
                                animationDelay: '150ms'
                            }}
                        />
                        <div className="w-2 h-2 rounded-full animate-bounce"
                            style={{
                                backgroundColor: 'currentColor',
                                animationDelay: '300ms'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceAssistantInput;