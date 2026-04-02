'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>('1');
  const [messageInput, setMessageInput] = useState('');

  const conversations = [
    {
      id: '1',
      name: 'Luxury Fashion Co.',
      avatar: '🏪',
      lastMessage: 'Your order has been shipped!',
      time: '2h ago',
      unread: 2,
      isVendor: true,
    },
    {
      id: '2',
      name: 'Elite Wear',
      avatar: '👔',
      lastMessage: 'Thank you for your purchase',
      time: '1d ago',
      unread: 0,
      isVendor: true,
    },
    {
      id: '3',
      name: 'Customer Support',
      avatar: '💬',
      lastMessage: 'How can we help you today?',
      time: '3d ago',
      unread: 0,
      isVendor: false,
    },
  ];

  const messages = [
    {
      id: '1',
      sender: 'vendor',
      text: 'Hello! Thank you for your order. Your items are being prepared for shipment.',
      time: '10:30 AM',
    },
    {
      id: '2',
      sender: 'user',
      text: 'Great! When can I expect delivery?',
      time: '10:35 AM',
    },
    {
      id: '3',
      sender: 'vendor',
      text: 'Your order has been shipped! Estimated delivery is December 20, 2025.',
      time: '2:15 PM',
    },
    {
      id: '4',
      sender: 'vendor',
      text: 'Tracking number: TRK123456789',
      time: '2:15 PM',
    },
  ];

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      console.log('Sending message:', messageInput);
      setMessageInput('');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-6">Messages</h1>

        <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-3 h-[600px]">
            {/* Conversations List */}
            <div className="border-r border-cool-gray-200 dark:border-charcoal-700 overflow-y-auto">
              <div className="p-4 border-b border-cool-gray-200 dark:border-charcoal-700">
                <input
                  type="text"
                  placeholder="Search messages..."
                  className="w-full px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                />
              </div>

              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedChat(conversation.id)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors ${
                    selectedChat === conversation.id ? 'bg-gold-50 dark:bg-charcoal-700' : ''
                  }`}
                >
                  <div className="w-12 h-12 bg-linear-to-br from-gold-600 to-gold-700 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                    {conversation.avatar}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-charcoal-900 dark:text-white truncate">
                        {conversation.name}
                      </h3>
                      {conversation.unread > 0 && (
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full ml-2">
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 truncate">
                      {conversation.lastMessage}
                    </p>
                    <p className="text-xs text-charcoal-500 dark:text-cool-gray-500 mt-1">
                      {conversation.time}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Chat Area */}
            {selectedChat ? (
              <div className="md:col-span-2 flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-cool-gray-200 dark:border-charcoal-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-br from-gold-600 to-gold-700 rounded-full flex items-center justify-center text-xl">
                      {conversations.find((c) => c.id === selectedChat)?.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-charcoal-900 dark:text-white">
                        {conversations.find((c) => c.id === selectedChat)?.name}
                      </h3>
                      <p className="text-xs text-green-600">Online</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors">
                    <span className="text-xl">⋮</span>
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] ${
                          message.sender === 'user'
                            ? 'bg-gold-600 text-white'
                            : 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-900 dark:text-white'
                        } rounded-2xl px-4 py-2`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'text-gold-100' : 'text-charcoal-500 dark:text-cool-gray-500'
                          }`}
                        >
                          {message.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-cool-gray-200 dark:border-charcoal-700">
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors">
                      <span className="text-xl">📎</span>
                    </button>
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                    />
                    <button className="p-2 hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 rounded-lg transition-colors">
                      <span className="text-xl">😊</span>
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="px-6 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 flex items-center justify-center text-center p-8">
                <div>
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">Select a conversation</h3>
                  <p className="text-charcoal-600 dark:text-cool-gray-400">
                    Choose a message from the list to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
