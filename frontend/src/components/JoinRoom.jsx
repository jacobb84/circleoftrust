import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Users, AlertCircle } from 'lucide-react';
import Logo from './Logo';
import { checkRoomExists, joinRoom, getRoomInfo } from '../utils/api';
import { decryptMessage } from '../utils/crypto';

export default function JoinRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [roomExists, setRoomExists] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkRoom = async () => {
      try {
        const result = await checkRoomExists(roomId);
        setRoomExists(result.exists);
        if (result.exists) {
          const info = await getRoomInfo(roomId);
          setRoomInfo(info);
        }
      } catch (err) {
        setRoomExists(false);
      } finally {
        setIsChecking(false);
      }
    };

    const savedPassword = sessionStorage.getItem(`room_${roomId}_password`);
    const savedUsername = sessionStorage.getItem(`room_${roomId}_username`);
    
    if (savedPassword && savedUsername) {
      navigate(`/room/${roomId}`, { replace: true });
      return;
    }

    checkRoom();
  }, [roomId, navigate]);

  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsJoining(true);
    setError('');
    
    try {
      if (roomInfo?.password_test) {
        const decrypted = await decryptMessage(roomInfo.password_test, password);
        if (decrypted !== 'OKAY') {
          setError('Incorrect password. Please check and try again.');
          setIsJoining(false);
          return;
        }
      }
      
      const result = await joinRoom(roomId, username.trim());
      sessionStorage.setItem(`room_${roomId}_password`, password);
      sessionStorage.setItem(`room_${roomId}_username`, username.trim());
      if (result.session_token) {
        sessionStorage.setItem(`room_${roomId}_token`, result.session_token);
      }
      navigate(`/room/${roomId}`);
    } catch (err) {
      if (err.message.includes('already taken')) {
        setError('Username already taken in this room. Please choose another.');
      } else {
        setError('Failed to join room. Please try again.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Logo size={64} className="animate-pulse mx-auto mb-4" />
          <p className="text-slate-300">Checking room...</p>
        </div>
      </div>
    );
  }

  if (!roomExists) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-500/20 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Room Not Found</h2>
          <p className="text-slate-300 mb-6">
            This room doesn't exist or has expired. Rooms are automatically deleted after their time limit.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-cyan-400 transition-all"
          >
            Create New Room
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
          <h1 className="text-2xl font-bold text-white mb-2">Join Secure Room</h1>
          <div className="bg-slate-800/50 rounded-lg px-4 py-2 inline-block">
            <span className="text-slate-300 text-sm">Room: </span>
            <span className="font-mono text-teal-400">{roomId}</span>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label htmlFor="join-username" className="block text-sm font-medium text-slate-200 mb-2">
              <Users className="w-4 h-4 inline mr-2" aria-hidden="true" />
              Your Username
            </label>
            <input
              id="join-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="What should we call you?"
              maxLength={50}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="join-password" className="block text-sm font-medium text-slate-200 mb-2">
              <Shield className="w-4 h-4 inline mr-2" aria-hidden="true" />
              Room Password
            </label>
            <input
              id="join-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the room password"
              aria-describedby="join-password-desc"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 transition-all"
            />
            <p id="join-password-desc" className="text-xs text-slate-400 mt-1">
              The password decrypts messages. Ask the room creator for it.
            </p>
          </div>

          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isJoining}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-slate-300 hover:text-teal-400 text-sm transition-colors"
          >
            Or create your own room
          </button>
        </div>
      </div>
    </div>
  );
}
