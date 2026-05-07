import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ScrollNoticeBar from './components/common/ScrollNoticeBar'
import ResourceList from './pages/resources/ResourceList'
import ResourceDetail from './pages/resources/ResourceDetail'
import { ProjectList } from './pages/projects/ProjectList'
import ProjectForm from './pages/projects/ProjectForm'
import ProjectDetail from './pages/projects/ProjectDetail'
import ProjectActuals from './pages/projects/ProjectActuals'
import AllocationPage from './pages/allocations/AllocationPage'
import RatePage from './pages/rates/RatePage'
import Dashboard from './pages/dashboard/Dashboard'
import AdminFilters from './pages/admin/AdminFilters'
import AdminScrollNotices from './pages/admin/AdminScrollNotices'
import AdminSettings from './pages/admin/AdminSettings'

function App() {
  return (
    <>
      <ScrollNoticeBar />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resources" element={<ResourceList />} />
          <Route path="/resources/:id" element={<ResourceDetail />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/new" element={<ProjectForm />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/actuals" element={<ProjectActuals />} />
          <Route path="/allocations" element={<AllocationPage />} />
          <Route path="/rates" element={<RatePage />} />
          <Route path="/admin/filters" element={<AdminFilters />} />
          <Route path="/admin/scroll-notices" element={<AdminScrollNotices />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Routes>
      </Layout>
    </>
  )
}

export default App
