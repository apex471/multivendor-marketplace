'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { getAuthToken } from '@/lib/api/auth';

interface Conversation {
  id: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  other: { id: string; name: string; username: string; avatar: string | null; role: string } | null;
}

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingConvos, setIsLoadingConvos] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => { if (json.success) setMyId(json.data?.user?.id ?? null); });
  }, []);

  const fetchConversations = useCallback(() => {
    const token = getAuthToken();
    if (!token) { setIsLoadingConvos(false); return; }
    fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => { if (json.success) setConversations(json.data.conversations ?? []); })
      .finally(() => setIsLoadingConvos(false));
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const fetchMessages = useCallback((convoId: string) => {
    const token = getAuthToken();
    if (!token) return;
    setIsLoadingMsgs(true);
    fetch(`/api/messages/${convoId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => { if (json.success) setMessages(json.data.messages ?? []); })
      .finally(() => setIsLoadingMsgs(false));
  }, []);

  const handleSelectConvo = (convoId: string) => {
    setSelectedConvoId(convoId);
    setMessages([]);
    fetchMessages(convoId);
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, unread: 0 } : c));
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async () => {
    const text = messageInput.trim();
    if (!text || !selectedConvoId || isSending) return;
    const token = getAuthToken();
    if (!token) return;
    setIsSending(true);
    setMessageInput('');
    try {
      const res = await fetch(`/api/messages/${selectedConvoId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages(prev => [...prev, json.data.message]);
        setConversations(prev => prev.map(c =>
          c.id === selectedConvoId ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() } : c
        ));
      }
    } finally { setIsSending(false); }
  };

  const selectedConvo = conversations.find(c => c.id === selectedConvoId);

  const formatTime = (iso: string) => {
    const diffH = (Date.now() - new Date(iso).getTime()) / 3600000;
    if (diffH < 1) return `${Math.floor(diffH * 60)}m ago`;
    if (diffH < 24) return `${Math.floor(diffH)}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-6">Messages</h1>
        <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-3 h-150">
            {/* Conversations */}
            <div className="border-r border-cool-gray-200 dark:border-charcoal-700 overflow-y-auto">
              <div className="p-4 border-b border-cool-gray-200 dark:border-charcoal-700">
                <p className="text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300">
                  {isLoadingConvos ? 'Loading...' : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              {!isLoadingConvos && conversations.length === 0 && (
                <div className="p-8 text-center text-charcoal-500 dark:text-cool-gray-400 text-sm">
                  No conversations yet.<br />Start a chat from a vendor or brand profile.
                </div>
              )}
              {conversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => handleSelectConvo(convo.id)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors ${selectedConvoId === convo.id ? 'bg-gold-50 dark:bg-charcoal-700' : ''}`}
                >
                  <div className="w-12 h-12 bg-linear-to-br from-gold-600 to-gold-700 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {convo.other?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-charcoal-900 dark:text-white truncate">{convo.other?.name ?? 'Unknown'}</h3>
                      {convo.unread > 0 && (
                        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full ml-2 shrink-0">{convo.unread}</span>
                      )}
                    </div>
                    <p className="text-sm text-charcoal-600 dark:text-cool-gray-400 truncate">{convo.lastMessage || 'No messages yet'}</p>
                    <p className="text-xs text-charcoal-500 dark:text-cool-gray-500 mt-1">{convo.lastMessageAt ? formatTime(convo.lastMessageAt) : ''}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Chat Area */}
            {selectedConvoId && selectedConvo ? (
              <div className="md:col-span-2 flex flex-col">
                <div className="p-4 border-b border-cool-gray-200 dark:border-charcoal-700 flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-gold-600 to-gold-700 rounded-full flex items-center justify-center text-white font-bold">
                    {selectedConvo.other?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-charcoal-900 dark:text-white">{selectedConvo.other?.name ?? 'Unknown'}</h3>
                    <p className="text-xs text-charcoal-500 dark:text-cool-gray-400 capitalize">{selectedConvo.other?.role ?? ''}</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isLoadingMsgs && <div className="text-center text-sm text-charcoal-500">Loading...</div>}
                  {!isLoadingMsgs && messages.length === 0 && (
                    <div className="text-center text-charcoal-500 dark:text-cool-gray-400 text-sm mt-8">No messages yet. Say hello! 👋</div>
                  )}
                  {messages.map((msg) => {
                    const isMe = msg.senderId === myId;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-gold-600 text-white' : 'bg-cool-gray-100 dark:bg-charcoal-700 text-charcoal-900 dark:text-white'}`}>
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-gold-100' : 'text-charcoal-500 dark:text-cool-gray-500'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-cool-gray-200 dark:border-charcoal-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-cool-gray-300 dark:border-charcoal-600 bg-white dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-600"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || !messageInput.trim()}
                      className="px-6 py-2 bg-gold-600 text-white rounded-lg font-semibold hover:bg-gold-700 disabled:opacity-50 transition-colors"
                    >
                      {isSending ? '...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 flex items-center justify-center text-center p-8">
                <div>
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">Select a conversation</h3>
                  <p className="text-charcoal-600 dark:text-cool-gray-400">Choose a message from the list to start chatting</p>
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
