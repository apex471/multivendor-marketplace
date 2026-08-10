'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/lib/api/auth';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

type TicketResponse = {
  from: 'customer' | 'admin' | 'vendor';
  authorName: string;
  message: string;
  timestamp: string;
};

type Ticket = {
  id: string;
  ticketNumber: string;
  orderId: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  responses: TicketResponse[];
  createdAt: string;
  customerName: string;
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login?redirect=/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchTicket = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const res = await fetch(`/api/tickets/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (json.success) {
          setTicket(json.data.ticket);
        } else {
          setError(json.message || 'Failed to load ticket');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    
    if (isAuthenticated) fetchTicket();
  }, [id, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.responses]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/tickets/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage })
      });
      const json = await res.json();
      
      if (json.success) {
        setTicket(prev => prev ? { ...prev, responses: [...prev.responses, json.data.response], status: 'open' } : null);
        setNewMessage('');
      } else {
        alert(json.message || 'Failed to send message');
      }
    } catch (err) {
      alert('Network error while sending message');
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!confirm('Are you sure you want to close this ticket?')) return;
    
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'closed' })
      });
      const json = await res.json();
      
      if (json.success) {
        setTicket(prev => prev ? { ...prev, status: 'closed' } : null);
      } else {
        alert(json.message || 'Failed to close ticket');
      }
    } catch (err) {
      alert('Network error while closing ticket');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cool-gray-400">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Error Loading Ticket</h2>
            <p className="text-cool-gray-400 mb-6">{error}</p>
            <button onClick={() => router.back()} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors">
              Go Back
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Determine user's current role in the ticket
  const myRole = user?.role === 'vendor' || user?.role === 'brand' ? 'vendor' : 'customer';

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Meta */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => router.back()} className="text-sm font-semibold text-purple-400 hover:text-purple-300 mb-4 inline-flex items-center gap-1">
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
              <span className="text-cool-gray-400">Ticket: <span className="text-cool-gray-300 font-mono">{ticket.ticketNumber}</span></span>
              <span className="text-cool-gray-600">•</span>
              <span className="text-cool-gray-400">Order: <span className="text-purple-400 font-mono font-semibold">{ticket.orderId}</span></span>
              <span className="text-cool-gray-600">•</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                ticket.status === 'open' ? 'bg-green-950/60 text-green-400 border border-green-900' :
                ticket.status === 'closed' ? 'bg-charcoal-800 text-cool-gray-400 border border-charcoal-700' :
                'bg-blue-950/60 text-blue-400 border border-blue-900'
              }`}>
                {ticket.status}
              </span>
            </div>
          </div>
          
          {ticket.status !== 'closed' && (
            <button 
              onClick={handleCloseTicket}
              className="px-5 py-2.5 border border-charcoal-700 hover:border-red-900 hover:bg-red-950/40 text-cool-gray-300 hover:text-red-400 text-sm font-semibold rounded-xl transition-all h-fit"
            >
              Close Ticket
            </button>
          )}
        </div>

        {/* Chat Interface */}
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ height: '65vh' }}>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Initial Ticket Message */}
            <div className="flex flex-col gap-1 items-start">
              <div className="bg-charcoal-800 border border-charcoal-700 text-cool-gray-200 px-5 py-4 rounded-2xl rounded-tl-sm max-w-[85%] sm:max-w-[75%] shadow-sm">
                <p className="whitespace-pre-wrap text-sm">{ticket.responses[0]?.message || 'No initial message'}</p>
              </div>
              <div className="text-[11px] text-cool-gray-500 font-medium ml-1">
                {ticket.responses[0]?.authorName} • {new Date(ticket.responses[0]?.timestamp || ticket.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Responses */}
            {ticket.responses.slice(1).map((msg, idx) => {
              const isMe = msg.from === myRole;
              const isAdmin = msg.from === 'admin';
              
              let bubbleClasses = '';
              let alignmentClass = '';
              let radiusClass = '';
              
              if (isAdmin) {
                bubbleClasses = 'bg-gold-900/20 border-gold-700/50 text-gold-100';
                alignmentClass = 'items-center';
                radiusClass = 'rounded-2xl shadow-md';
              } else if (isMe) {
                bubbleClasses = 'bg-purple-600 text-white shadow-md';
                alignmentClass = 'items-end';
                radiusClass = 'rounded-2xl rounded-tr-sm';
              } else {
                bubbleClasses = 'bg-charcoal-800 border-charcoal-700 text-cool-gray-200 shadow-sm';
                alignmentClass = 'items-start';
                radiusClass = 'rounded-2xl rounded-tl-sm';
              }

              return (
                <div key={idx} className={`flex flex-col gap-1 ${alignmentClass}`}>
                  {isAdmin && <div className="text-[11px] font-bold text-gold-500 uppercase tracking-wider mb-1">CLW Support</div>}
                  <div className={`px-5 py-3 border ${bubbleClasses} ${radiusClass} max-w-[85%] sm:max-w-[75%]`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                  </div>
                  <div className="text-[11px] text-cool-gray-500 font-medium mx-1">
                    {!isMe && !isAdmin && `${msg.authorName} • `}
                    {new Date(msg.timestamp).toLocaleString()}
                  </div>
                </div>
              );
            })}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-charcoal-800 border-t border-charcoal-700 p-4">
            {ticket.status === 'closed' ? (
              <div className="text-center p-3 text-sm text-cool-gray-400 bg-charcoal-900 rounded-xl border border-charcoal-700">
                This ticket has been closed. To continue the conversation, please send a new message to reopen it.
              </div>
            ) : null}
            
            <form onSubmit={handleSendMessage} className="mt-2 flex gap-3">
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                className="flex-1 bg-charcoal-900 border border-charcoal-700 text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all min-h-[50px] max-h-[120px]"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-charcoal-700 disabled:text-cool-gray-500 text-white font-bold px-6 rounded-xl transition-all shadow-md self-end min-h-[50px]"
              >
                {sending ? '...' : 'Send'}
              </button>
            </form>
            <p className="text-[10px] text-cool-gray-500 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line.
            </p>
          </div>
          
        </div>
      </main>

      <Footer />
    </div>
  );
}
