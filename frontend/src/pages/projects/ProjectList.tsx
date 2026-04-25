import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, Project } from '../api/projects';

export function ProjectList() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects', page, status],
    queryFn: () => projectsApi.list({ page, size: 20 }),
  });

  const projects: Project[] = data?.data?.content || [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      REQUESTED: 'bg-blue-100 text-blue-800',
      EXECUTING: 'bg-green-100 text-green-800',
      ON_HOLD: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <a href="/projects/new" className="btn btn-primary">
          New Project
        </a>
      </div>

      <div className="mb-4 flex gap-4">
        <select
          className="select select-bordered"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="EXECUTING">Executing</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="loading loading-spinner" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Request ID</th>
                <th>Budget</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="hover cursor-pointer"
                  onClick={() => (window.location.href = `/projects/${project.id}`)}
                >
                  <td>{project.name}</td>
                  <td>{project.requestId || '-'}</td>
                  <td>${project.budgetTotalK}K</td>
                  <td>
                    <span className={`badge ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td>{project.startDate || '-'}</td>
                  <td>{project.endDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-center mt-4 gap-2">
        <button
          className="btn btn-ghost"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span className="flex items-center px-4">
          Page {page + 1}
        </span>
        <button
          className="btn btn-ghost"
          disabled={!data?.data?.content?.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
