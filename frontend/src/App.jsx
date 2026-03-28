import { Routes, Route } from 'react-router-dom'
import CreateRoom from './components/CreateRoom'
import JoinRoom from './components/JoinRoom'
import ChatRoom from './components/ChatRoom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateRoom />} />
      <Route path="/join/:roomId" element={<JoinRoom />} />
      <Route path="/room/:roomId" element={<ChatRoom />} />
    </Routes>
  )
}

export default App
