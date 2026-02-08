import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    system?: boolean;
}

interface ChatBoxProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    className?: string;
}

const QUICK_CHATS = [
    "Nice hand!",
    "Well played",
    "Unlucky",
    "Hurry up!",
    "Thinking...",
    "Good luck"
];

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, className = '' }) => {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    return (
        <div className={`flex flex-col bg-gray-900/90 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-60">
                {messages.map((msg) => (
                    <div key={msg.id} className={`text-sm ${msg.system ? 'text-yellow-400 italic text-center' : 'text-white'}`}>
                        {!msg.system && <span className="font-bold text-gray-400">{msg.sender}: </span>}
                        {msg.text}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Chat & Input */}
            <div className="p-2 border-t border-gray-700 bg-gray-800">
                <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                    {QUICK_CHATS.map((text, i) => (
                        <button
                            key={i}
                            onClick={() => onSendMessage(text)}
                            className="whitespace-nowrap px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full text-xs text-gray-300"
                        >
                            {text}
                        </button>
                    ))}
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-gold"
                    />
                    <button
                        type="submit"
                        className="px-3 py-1 bg-gold text-black text-sm font-bold rounded hover:bg-yellow-500"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatBox;
