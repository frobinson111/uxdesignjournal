import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { adminListPopupLeads, adminListPopups, adminExportPopupLeads, adminDeletePopupLead, type PopupLead, type PopupConfig } from '../../api/admin'

export function AdminPopupLeads() {
  const { token } = useAuth()
  const [leads, setLeads] = useState<PopupLead[]>([])
  const [popups, setPopups] = useState<PopupConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedPopup, setSelectedPopup] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const loadLeads = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminListPopupLeads(token, {
        page,
        limit: 20,
        popupId: selectedPopup || undefined,
        search: searchQuery || undefined,
      })
      setLeads(data.leads || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to load leads:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPopups = async () => {
    if (!token) return
    try {
      const data = await adminListPopups(token)
      setPopups(data.popups || [])
    } catch (err) {
      console.error('Failed to load popups:', err)
    }
  }

  useEffect(() => {
    loadPopups()
  }, [token])

  useEffect(() => {
    loadLeads()
  }, [token, page, selectedPopup, searchQuery])

  const handleExport = async () => {
    if (!token) return
    try {
      await adminExportPopupLeads(token, selectedPopup || undefined)
    } catch (err) {
      console.error('Failed to export leads:', err)
      alert('Failed to export leads')
    }
  }

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this lead?')) return
    try {
      await adminDeletePopupLead(token, id)
      loadLeads()
    } catch (err) {
      console.error('Failed to delete lead:', err)
      alert('Failed to delete lead')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadLeads()
  }

  if (loading && page === 1) return <div>Loading...</div>

  return (
    <div className="admin-section">
      <div className="admin-header">
        <h1>Popup Leads ({total})</h1>
        <button onClick={handleExport} className="btn-primary">
          Export to CSV
        </button>
      </div>

      <div className="filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="search"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <select
          value={selectedPopup}
          onChange={(e) => {
            setSelectedPopup(e.target.value)
            setPage(1)
          }}
          className="popup-filter"
        >
          <option value="">All Popups</option>
          {popups.map((popup) => (
            <option key={popup.id} value={popup.id}>
              {popup.name}
            </option>
          ))}
        </select>
      </div>

      {leads.length === 0 ? (
        <p>No leads found.</p>
      ) : (
        <>
          <div className="leads-table-wrapper">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Popup</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td><strong>{lead.email}</strong></td>
                    <td>
                      <div className="popup-cell">
                        <div className="popup-name">{lead.popupName}</div>
                        <div className="popup-title">{lead.popupTitle}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${lead.status}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="ip-address">{lead.ipAddress || 'N/A'}</td>
                    <td>{new Date(lead.createdAt).toLocaleString()}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="btn-small btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        .filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          align-items: center;
        }
        
        .search-form {
          display: flex;
          gap: 0.5rem;
          flex: 1;
          max-width: 400px;
        }
        
        .search-form input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .popup-filter {
          padding: 0.5rem 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }
        
        .leads-table-wrapper {
          overflow-x: auto;
          background: white;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .leads-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .leads-table th {
          background: #f8f9fa;
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #dee2e6;
        }
        
        .leads-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #dee2e6;
        }
        
        .leads-table tbody tr:hover {
          background: #f8f9fa;
        }
        
        .popup-cell {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .popup-name {
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .popup-title {
          font-size: 0.8rem;
          color: #666;
        }
        
        .badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .badge-active {
          background: #d4edda;
          color: #155724;
        }
        
        .ip-address {
          font-family: monospace;
          font-size: 0.875rem;
          color: #666;
        }
        
        .btn-small {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          border: none;
          border-radius: 3px;
          cursor: pointer;
        }
        
        .btn-danger {
          background: #dc3545;
          color: white;
        }
        
        .btn-danger:hover {
          background: #c82333;
        }
        
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .pagination button {
          padding: 0.5rem 1rem;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .pagination button:not(:disabled):hover {
          background: #f8f9fa;
        }
      `}</style>
    </div>
  )
}
