import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { Directory } from './views/Directory.jsx'
import { Channel } from './views/Channel.jsx'
import { Ranking } from './views/Ranking.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Directory />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/canal/:username" element={<Channel />} />
      </Routes>
    </Layout>
  )
}
