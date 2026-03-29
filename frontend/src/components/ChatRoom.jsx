import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Users, Clock, LogOut, Copy, Check, Shield, AlertTriangle, X } from 'lucide-react';
import Logo from './Logo';
import { getRoomInfo, getMessages, sendMessage, joinRoom, leaveRoom, subscribeToRoom, getRoomUsers } from '../utils/api';
import { encryptMessage, decryptMessage } from '../utils/crypto';

export default function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [sessionToken, setSessionToken] = useState(null);
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const userListRef = useRef(null);
  const seenEventsRef = useRef(new Set());

  const password = sessionStorage.getItem(`room_${roomId}_password`);
  const username = sessionStorage.getItem(`room_${roomId}_username`);
  const storedToken = sessionStorage.getItem(`room_${roomId}_token`);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userListRef.current && !userListRef.current.contains(event.target)) {
        setShowUserList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!password || !username) {
      navigate(`/join/${roomId}`);
      return;
    }

    const initRoom = async () => {
      try {
        const info = await getRoomInfo(roomId);
        if (!info) {
          navigate(`/join/${roomId}`);
          return;
        }
        setRoomInfo(info);

        const existingMessages = await getMessages(roomId);
        const decryptedMessages = await Promise.all(
          existingMessages.map(async (msg) => ({
            ...msg,
            content: await decryptMessage(msg.encrypted_content, password),
            isOwn: msg.sender_name === username
          }))
        );
        setMessages(decryptedMessages);

        if (storedToken) {
          setSessionToken(storedToken);
          const usersResult = await getRoomUsers(roomId);
          setOnlineUsers(usersResult.users || [username]);
        } else {
          const joinResult = await joinRoom(roomId, username);
          if (joinResult.users) {
            setOnlineUsers(joinResult.users);
          } else {
            setOnlineUsers([username]);
          }
          if (joinResult.session_token) {
            setSessionToken(joinResult.session_token);
            sessionStorage.setItem(`room_${roomId}_token`, joinResult.session_token);
          }
        }

        eventSourceRef.current = subscribeToRoom(roomId, null, async (data) => {
          if (data.type === 'message') {
            const decryptedContent = await decryptMessage(data.encrypted_content, password);
            setMessages((prev) => {
              const exists = prev.some(m => m.id === data.id);
              if (exists) return prev;
              return [...prev, {
                id: data.id,
                sender_name: data.sender_name,
                content: decryptedContent,
                timestamp: data.timestamp,
                isOwn: data.sender_name === username
              }];
            });
          } else if (data.type === 'user_joined') {
            const eventKey = `join_${data.username}_${Date.now() - (Date.now() % 5000)}`;
            if (data.username !== username && !seenEventsRef.current.has(eventKey)) {
              seenEventsRef.current.add(eventKey);
              setOnlineUsers((prev) => {
                if (!prev.includes(data.username)) {
                  return [...prev, data.username];
                }
                return prev;
              });
              addAnnouncement(`${data.username} joined the room`);
            }
          } else if (data.type === 'user_left') {
            const eventKey = `leave_${data.username}_${Date.now() - (Date.now() % 5000)}`;
            setOnlineUsers((prev) => prev.filter(u => u !== data.username));
            if (data.username !== username && !seenEventsRef.current.has(eventKey)) {
              seenEventsRef.current.add(eventKey);
              addAnnouncement(`${data.username} left the room`);
            }
          } else if (data.type === 'room_deleted') {
            sessionStorage.removeItem(`room_${roomId}_password`);
            sessionStorage.removeItem(`room_${roomId}_username`);
            sessionStorage.removeItem(`room_${roomId}_token`);
            navigate('/', { state: { message: 'Room has been closed' } });
          }
        });
      } catch (err) {
        console.error('Failed to initialize room:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initRoom();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      leaveRoom(roomId, username);
    };
  }, [roomId, password, username, navigate]);

  const addAnnouncement = (text) => {
    const id = Date.now();
    setAnnouncements((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setAnnouncements((prev) => prev.filter(a => a.id !== id));
    }, 5000);
  };

  useEffect(() => {
    if (!roomInfo) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const expires = new Date(roomInfo.expires_at);
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        sessionStorage.removeItem(`room_${roomId}_password`);
        sessionStorage.removeItem(`room_${roomId}_username`);
        sessionStorage.removeItem(`room_${roomId}_token`);
        navigate('/', { state: { message: 'Room has expired' } });
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [roomInfo, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !sessionToken) return;

    setIsSending(true);
    try {
      const encrypted = await encryptMessage(newMessage, password);
      await sendMessage(roomId, encrypted, sessionToken);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      if (err.message.includes('Session expired')) {
        addAnnouncement('Session expired - please rejoin the room');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleLeave = async () => {
    await leaveRoom(roomId, username);
    sessionStorage.removeItem(`room_${roomId}_password`);
    sessionStorage.removeItem(`room_${roomId}_username`);
    sessionStorage.removeItem(`room_${roomId}_token`);
    navigate('/');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isExpiringSoon = () => {
    if (!roomInfo) return false;
    const now = new Date();
    const expires = new Date(roomInfo.expires_at);
    return (expires - now) < 120000;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Logo size={64} className="animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Entering secure room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex-shrink-0 bg-slate-900/80 backdrop-blur-xl border-b border-teal-500/20 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className="text-white font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-400" />
                Secure Room
              </h1>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400 font-mono">{roomId}</span>
                <button onClick={copyLink} className="text-slate-500 hover:text-teal-400 transition-colors">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative" ref={userListRef}>
              <button
                onClick={() => setShowUserList(!showUserList)}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-teal-400" />
                <span className="text-slate-300">{onlineUsers.length}</span>
              </button>

              {showUserList && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Online Users</span>
                    <button
                      onClick={() => setShowUserList(false)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {onlineUsers.map((user, index) => (
                      <div
                        key={index}
                        className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
                        <span className={`text-sm ${user === username ? 'text-teal-400 font-medium' : 'text-slate-300'}`}>
                          {user}{user === username ? ' (you)' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  {onlineUsers.length === 0 && (
                    <div className="px-4 py-4 text-center text-slate-500 text-sm">
                      No users online
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${
              isExpiringSoon() ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {isExpiringSoon() && <AlertTriangle className="w-4 h-4" />}
              <Clock className="w-4 h-4" />
              <span className="font-mono">{timeLeft}</span>
            </div>

            <button
              onClick={handleLeave}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        {announcements.length > 0 && (
          <div className="flex-shrink-0 px-4 pt-2">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="mb-2 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-center text-sm text-slate-400 animate-pulse"
              >
                {announcement.text}
              </div>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-teal-500/30 mx-auto mb-4" />
              <p className="text-slate-500">No messages yet. Start the conversation!</p>
              <p className="text-slate-600 text-sm mt-2">All messages are end-to-end encrypted.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${msg.isOwn ? 'order-2' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${msg.isOwn ? 'text-teal-400' : 'text-slate-400'}`}>
                      {msg.isOwn ? 'You' : msg.sender_name}
                    </span>
                    <span className="text-xs text-slate-600">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl ${
                    msg.isOwn
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                      : 'bg-slate-800 text-slate-200'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 p-4 border-t border-slate-800 bg-slate-950/50">
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-600">
            <Shield className="w-3 h-3" />
            <span>End-to-end encrypted</span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-700">v1.0.8</span>
          </div>
        </div>
      </main>
    </div>
  );
}
