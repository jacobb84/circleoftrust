import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Shield, Users, Copy, Check } from 'lucide-react';
import Logo from './Logo';
import { createRoom } from '../utils/api';
import { encryptMessage } from '../utils/crypto';

export default function CreateRoom() {
  const navigate = useNavigate();
  const [duration, setDuration] = useState(30);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const passwordTest = await encryptMessage('OKAY', password);
      const room = await createRoom(duration, passwordTest);
      setCreatedRoom(room);
    } catch (err) {
      setError('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinCreatedRoom = () => {
    sessionStorage.setItem(`room_${createdRoom.id}_password`, password);
    sessionStorage.setItem(`room_${createdRoom.id}_username`, username);
    navigate(`/room/${createdRoom.id}`);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/room/${createdRoom.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const durations = [
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
  ];

  if (createdRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-teal-500/20 rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-teal-500/20 rounded-full">
                <Check className="w-8 h-8 text-teal-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Room Created!</h2>
            <p className="text-slate-300">Your secure room is ready</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <div className="text-sm text-slate-300 mb-1">Room ID</div>
            <div className="font-mono text-teal-400 text-lg">{createdRoom.id}</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <div className="text-sm text-slate-300 mb-1">Share Link</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/room/${createdRoom.id}`}
                className="flex-1 bg-transparent text-slate-300 text-sm truncate outline-none"
              />
              <button
                onClick={copyLink}
                aria-label={copied ? "Link copied" : "Copy share link"}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-teal-400" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-300" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
            <p className="text-amber-400 text-sm">
              <strong>Important:</strong> Share the password separately! It's your encryption key.
            </p>
          </div>

          <button
            onClick={handleJoinCreatedRoom}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/25"
          >
            Enter Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-teal-500/20 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={64} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Circle of Trust</h1>
          <p className="text-slate-300">Create a secure, temporary chat room</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-200 mb-2">
              <Users className="w-4 h-4 inline mr-2" aria-hidden="true" />
              Your Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Anonymous"
              maxLength={50}
              aria-describedby="username-desc"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
              <Shield className="w-4 h-4 inline mr-2" aria-hidden="true" />
              Room Password (Encryption Key)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Strong password for E2E encryption"
              aria-describedby="password-desc"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 transition-all"
            />
            <p id="password-desc" className="text-xs text-slate-400 mt-1">
              This password encrypts all messages. Share it securely with participants.
            </p>
          </div>

          <div>
            <fieldset>
              <legend className="block text-sm font-medium text-slate-200 mb-3">
                <Clock className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Room Duration
              </legend>
              <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Select room duration">
                {durations.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    role="radio"
                    aria-checked={duration === d.value}
                    onClick={() => setDuration(d.value)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      duration === d.value
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Secure Room'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-teal-400 text-lg font-semibold">E2E</div>
              <div className="text-slate-400 text-xs">Encrypted</div>
            </div>
            <div>
              <div className="text-teal-400 text-lg font-semibold">Temp</div>
              <div className="text-slate-400 text-xs">Auto-Delete</div>
            </div>
            <div>
              <div className="text-teal-400 text-lg font-semibold">Anon</div>
              <div className="text-slate-400 text-xs">No Tracking</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
