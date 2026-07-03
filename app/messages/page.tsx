'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

interface SearchUser {
  id: string;
  firstName: string;
  lastName?: string;
  role: string;
  storeName?: string;
  avatar?: string | null;
}

// ── Avatar initials fallback ────────────────────────────────────────────────
function AvatarBubble({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const letter = (name || '?')[0].toUpperCase();
  const cls = size === 'sm'
    ? 'w-9 h-9 text-sm'
    : 'w-11 h-11 text-base';
  return (
    <div className={`${cls} rounded-full bg-linear-to-br from-gold-600 to-gold-800 flex items-center justify-center text-white font-bold shrink-0`}>
      {letter}
    </div>
  );
}

function formatTime(iso: string) {
  const diffH = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (diffH < 1)  return `${Math.floor(diffH * 60)}m ago`;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

// ── New Conversation Search Modal ───────────────────────────────────────────
function NewConversationModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (userId: string, name: string) => void;
}) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current !== undefined) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        const res   = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        setResults(json.success ? json.data.users ?? [] : []);
      } catch { setResults([]); }
      finally  { setLoading(false); }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-cool-gray-200 dark:border-charcoal-700">
          <h2 className="text-lg font-bold text-charcoal-900 dark:text-white">New Message</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 text-cool-gray-500 dark:text-cool-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cool-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              autoFocus
              type="text"
              placeholder="Search vendors, brands, customers..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-cool-gray-200 dark:border-charcoal-600 rounded-xl bg-cool-gray-50 dark:bg-charcoal-700 text-charcoal-900 dark:text-white text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {loading && (
              <p className="text-center text-sm text-cool-gray-400 py-4">Searching...</p>
            )}
            {!loading && query && results.length === 0 && (
              <p className="text-center text-sm text-cool-gray-400 py-4">No users found</p>
            )}
            {results.map(u => {
              const name = u.storeName || `${u.firstName} ${u.lastName ?? ''}`.trim();
              return (
                <button key={u.id} onClick={() => onStart(u.id, name)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cool-gray-50 dark:hover:bg-charcoal-700 transition-colors text-left">
                  <AvatarBubble name={name} size="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold text-charcoal-900 dark:text-white text-sm truncate">{name}</p>
                    <p className="text-xs text-cool-gray-400 capitalize">{u.role}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
function MessagesContent() {
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const [conversations,   setConversations]   = useState<Conversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [messages,        setMessages]        = useState<ChatMessage[]>([]);
  const [messageInput,    setMessageInput]    = useState('');
  const [isLoadingConvos, setIsLoadingConvos] = useState(true);
  const [isLoadingMsgs,   setIsLoadingMsgs]   = useState(false);
  const [isSending,       setIsSending]       = useState(false);
  const [myId,            setMyId]            = useState<string | null>(null);
  const [mobileView,      setMobileView]      = useState<'list' | 'chat'>('list');
  const [showNewMsg,      setShowNewMsg]      = useState(false);
  const [sendError,       setSendError]       = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didAutoOpen    = useRef(false);

  // Guard: must be logged in
  useEffect(() => {
    if (!getAuthToken()) router.replace('/auth/login?redirect=/messages');
  }, [router]);

  // Fetch self
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
    return fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => { if (json.success) setConversations(json.data.conversations ?? []); })
      .finally(() => setIsLoadingConvos(false));
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const fetchMessages = useCallback((convoId: string) => {
    const token = getAuthToken();
    if (!token) return;
    setIsLoadingMsgs(true);
    setSendError('');
    fetch(`/api/messages/${convoId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => { if (json.success) setMessages(json.data.messages ?? []); })
      .finally(() => setIsLoadingMsgs(false));
  }, []);

  const openConversation = useCallback((convoId: string) => {
    setSelectedConvoId(convoId);
    setMessages([]);
    setSendError('');
    fetchMessages(convoId);
    setConversations(prev => prev.map(c => c.id === convoId ? { ...c, unread: 0 } : c));
    setMobileView('chat');
  }, [fetchMessages]);

  // Auto-open a conversation from ?convo=ID query param (set by vendor DM button)
  useEffect(() => {
    const convoParam = searchParams.get('convo');
    if (convoParam && !didAutoOpen.current && !isLoadingConvos) {
      didAutoOpen.current = true;
      openConversation(convoParam);
    }
  }, [searchParams, isLoadingConvos, openConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    const text = messageInput.trim();
    if (!text || !selectedConvoId || isSending) return;
    const token = getAuthToken();
    if (!token) return;
    setIsSending(true);
    setMessageInput('');
    setSendError('');
    try {
      const res  = await fetch(`/api/messages/${selectedConvoId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages(prev => [...prev, json.data.message]);
        setConversations(prev => prev.map(c =>
          c.id === selectedConvoId
            ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() }
            : c
        ));
      } else {
        setSendError(json.message || 'Failed to send');
        setMessageInput(text); // restore
      }
    } catch {
      setSendError('Network error — please try again');
      setMessageInput(text);
    } finally { setIsSending(false); }
  };

  // Start new conversation from search modal
  const handleStartConversation = async (recipientId: string, _name: string) => {
    const token = getAuthToken();
    if (!token) return;
    setShowNewMsg(false);
    try {
      const res  = await fetch('/api/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, text: '' }),
      });
      const json = await res.json();
      if (json.success && json.data?.conversationId) {
        await fetchConversations();
        openConversation(json.data.conversationId);
      }
    } catch { /* silent */ }
  };

  const selectedConvo = conversations.find(c => c.id === selectedConvoId);

  return (
    <div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950 flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-900 dark:text-white">Messages</h1>
          <button
            onClick={() => setShowNewMsg(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-gold-600/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Message
          </button>
        </div>

        <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-lg overflow-hidden border border-cool-gray-100 dark:border-charcoal-700"
          style={{ height: 'calc(100vh - 240px)', minHeight: '520px' }}>
          <div className="grid md:grid-cols-3 h-full">

            {/* ── Conversation List ─────────────────────────────────────── */}
            <div className={`border-r border-cool-gray-100 dark:border-charcoal-700 flex flex-col overflow-hidden ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b border-cool-gray-100 dark:border-charcoal-700 shrink-0">
                <p className="text-xs font-bold uppercase tracking-wider text-cool-gray-400 dark:text-cool-gray-500">
                  {isLoadingConvos ? 'Loading...' : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoadingConvos && (
                  <div className="space-y-px">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                        <div className="w-11 h-11 rounded-full bg-cool-gray-200 dark:bg-charcoal-700 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-cool-gray-200 dark:bg-charcoal-700 rounded w-3/5" />
                          <div className="h-2.5 bg-cool-gray-200 dark:bg-charcoal-700 rounded w-4/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isLoadingConvos && conversations.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-cool-gray-100 dark:bg-charcoal-700 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-cool-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-charcoal-700 dark:text-cool-gray-300 mb-1">No messages yet</p>
                    <p className="text-xs text-cool-gray-400 mb-4">Visit a vendor page and tap <strong>Message</strong> to start a DM.</p>
                    <button onClick={() => setShowNewMsg(true)}
                      className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-xl text-xs font-semibold transition-colors">
                      Start a Conversation
                    </button>
                  </div>
                )}

                {conversations.map((convo) => (
                  <button
                    key={convo.id}
                    onClick={() => openConversation(convo.id)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-cool-gray-50 dark:hover:bg-charcoal-700/50 transition-colors border-b border-cool-gray-50 dark:border-charcoal-700/50 last:border-0 text-left ${selectedConvoId === convo.id ? 'bg-gold-50 dark:bg-charcoal-700 border-l-2 border-l-gold-600' : ''}`}
                  >
                    <AvatarBubble name={convo.other?.name ?? '?'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-semibold text-charcoal-900 dark:text-white text-sm truncate">{convo.other?.name ?? 'Unknown'}</h3>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {convo.unread > 0 && (
                            <span className="bg-gold-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{convo.unread}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-cool-gray-500 dark:text-cool-gray-400 truncate">{convo.lastMessage || 'No messages yet'}</p>
                      {convo.lastMessageAt && (
                        <p className="text-[10px] text-cool-gray-400 dark:text-cool-gray-500 mt-0.5">{formatTime(convo.lastMessageAt)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Chat Area ─────────────────────────────────────────────── */}
            {selectedConvoId && selectedConvo ? (
              <div className={`md:col-span-2 flex flex-col h-full ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
                {/* Chat Header */}
                <div className="p-4 border-b border-cool-gray-100 dark:border-charcoal-700 flex items-center gap-3 shrink-0 bg-white dark:bg-charcoal-800">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-2 -ml-1 rounded-lg hover:bg-cool-gray-100 dark:hover:bg-charcoal-700 text-charcoal-600 dark:text-cool-gray-300 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <AvatarBubble name={selectedConvo.other?.name ?? '?'} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-charcoal-900 dark:text-white text-sm truncate">{selectedConvo.other?.name ?? 'Unknown'}</h3>
                    <p className="text-xs text-cool-gray-400 capitalize">{selectedConvo.other?.role ?? ''}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-cool-gray-50 dark:bg-charcoal-900">
                  {isLoadingMsgs && (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'} animate-pulse`}>
                          <div className={`h-10 rounded-2xl ${i % 2 ? 'bg-gold-200 dark:bg-gold-900/30 w-48' : 'bg-cool-gray-200 dark:bg-charcoal-700 w-56'}`} />
                        </div>
                      ))}
                    </div>
                  )}
                  {!isLoadingMsgs && messages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-14 h-14 rounded-full bg-white dark:bg-charcoal-800 shadow-sm flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-sm text-cool-gray-400">No messages yet — say hello! 👋</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isMe = msg.senderId === myId;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm ${isMe ? 'bg-gold-600 text-white rounded-br-sm' : 'bg-white dark:bg-charcoal-800 text-charcoal-900 dark:text-white rounded-bl-sm'}`}>
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-gold-100/80' : 'text-cool-gray-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 sm:p-4 border-t border-cool-gray-100 dark:border-charcoal-700 shrink-0 bg-white dark:bg-charcoal-800">
                  {sendError && (
                    <p className="text-xs text-red-500 mb-2 px-1">{sendError}</p>
                  )}
                  <div className="flex gap-2 items-end">
                    <textarea
                      rows={1}
                      value={messageInput}
                      onChange={(e) => { setMessageInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      placeholder="Type a message… (Enter to send)"
                      className="flex-1 px-4 py-2.5 border border-cool-gray-200 dark:border-charcoal-600 bg-cool-gray-50 dark:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-xl focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 text-sm resize-none transition-all leading-relaxed min-h-[42px] max-h-[120px]"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || !messageInput.trim()}
                      className="px-5 py-2.5 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold disabled:opacity-40 transition-all text-sm shrink-0 h-[42px] shadow-sm shadow-gold-600/20">
                      {isSending ? (
                        <svg className="w-4 h-4 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`md:col-span-2 flex items-center justify-center p-8 bg-cool-gray-50 dark:bg-charcoal-900 ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
                <div className="text-center max-w-xs">
                  <div className="w-20 h-20 rounded-full bg-white dark:bg-charcoal-800 shadow-md flex items-center justify-center mx-auto mb-5">
                    <svg className="w-9 h-9 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-charcoal-900 dark:text-white mb-2">Your messages</h3>
                  <p className="text-sm text-cool-gray-400 mb-5">Select a conversation or start a new one.</p>
                  <button onClick={() => setShowNewMsg(true)}
                    className="px-5 py-2.5 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-gold-600/20">
                    New Message
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewMsg && (
        <NewConversationModal
          onClose={() => setShowNewMsg(false)}
          onStart={handleStartConversation}
        />
      )}

      <Footer />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cool-gray-50 dark:bg-charcoal-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <MessagesContent />
    </Suspense>
  );
}
