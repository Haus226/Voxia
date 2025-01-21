import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

const MessageBubble = ({ message }) => {
    const hasAudio = message.audioURL || message.audioBase64;
    const hasSources = message.sources && message.sources.length > 0;
    const isUser = message.sender === "user";
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showSources, setShowSources] = useState(false);
    const audioRef = useRef(null);
    const progressRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        if (hasAudio && !audioRef.current) {
            if (message.audioBase64) {
                const audioBlob = new Blob(
                    [Uint8Array.from(atob(message.audioBase64), (c) => c.charCodeAt(0))],
                    { type: "audio/mp3" }
                );
                audioRef.current = new Audio(URL.createObjectURL(audioBlob));
            } else if (message.audioURL) {
                audioRef.current = new Audio(message.audioURL);
            }
        }

        const updateProgress = () => {
            if (audioRef.current && !audioRef.current.paused) {
                const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                setProgress(percent);
                rafRef.current = requestAnimationFrame(updateProgress);
            }
        };

        const handlePlay = () => {
            setIsPlaying(true);
            rafRef.current = requestAnimationFrame(updateProgress);
        };

        const handlePause = () => {
            setIsPlaying(false);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };

        if (audioRef.current) {
            audioRef.current.addEventListener('play', handlePlay);
            audioRef.current.addEventListener('pause', handlePause);
            audioRef.current.addEventListener('ended', handleEnded);
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('play', handlePlay);
                audioRef.current.removeEventListener('pause', handlePause);
                audioRef.current.removeEventListener('ended', handleEnded);
                audioRef.current.pause();
            }
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [hasAudio, message.audioBase64, message.audioURL]);

    const handleAudioToggle = () => {
        if (!audioRef.current) return;
        audioRef.current.volume = 1;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleProgressClick = (e) => {
        if (!audioRef.current || !progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = percent * audioRef.current.duration;
        setProgress(percent * 100);
    };

    const formatTimestamp = () => {
        const date = new Date();
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-md rounded-lg text-white overflow-hidden ${isUser
                    ? "bg-gradient-to-r from-indigo-500 to-indigo-600"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600"
                    }`}
            >
                <div className="p-3" onDoubleClick={handleAudioToggle}>
                    <p className="text-sm">{message.text}</p>

                    <div className="mt-2 text-xs text-white/70">
                        {formatTimestamp()}
                    </div>
                    
                    {hasAudio && (
                        <div
                            ref={progressRef}
                            className="w-full h-1 bg-black bg-opacity-20 rounded cursor-pointer mt-2"
                            onClick={handleProgressClick}
                        >
                            <div
                                className="h-full bg-green-500 rounded transform-gpu transition-transform duration-75 ease-out"
                                style={{
                                    width: `${progress}%`,
                                    transform: 'translateZ(0)',
                                    willChange: 'width'
                                }}
                            />
                        </div>
                    )}
                </div>

                {hasSources && (
                    <div className="border-t border-white/10">
                        <button
                            onClick={() => setShowSources(!showSources)}
                            className="w-full px-3 py-1 text-xs text-white/80 hover:bg-white/10 transition-colors text-left flex items-center gap-1"
                        >
                            <ExternalLink className="w-3 h-3" />
                            {showSources ? "Hide sources" : "Show sources"}
                        </button>
                        {showSources && (
                            <div className="px-3 py-2 bg-black/10">
                                {message.sources.map((source, index) => (
                                    <a
                                        key={index}
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-xs text-white/80 hover:text-white hover:underline py-0.5"
                                    >
                                        {source.title}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;