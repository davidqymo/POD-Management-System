import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ResourceList from './pages/resources/ResourceList'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ResourceList />} />
        <Route path="/resources" element={<ResourceList />} />
      </Routes>
    </Layout>
  )
}

export default App
