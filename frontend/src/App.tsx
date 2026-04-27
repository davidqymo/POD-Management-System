import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ResourceList from './pages/resources/ResourceList'
import ResourceDetail from './pages/resources/ResourceDetail'
import { ProjectList } from './pages/projects/ProjectList'
import ProjectForm from './pages/projects/ProjectForm'
import ProjectDetail from './pages/projects/ProjectDetail'
import AllocationPage from './pages/allocations/AllocationPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ResourceList />} />
        <Route path="/resources" element={<ResourceList />} />
        <Route path="/resources/:id" element={<ResourceDetail />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/new" element={<ProjectForm />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/allocations" element={<AllocationPage />} />
      </Routes>
    </Layout>
  )
}

export default App
