import { useEffect, useState } from 'react'
import { adminDeleteContact, adminListContacts, adminUpdateContact } from '../../api/admin'
import type { Contact } from '../../types'
import { useAuth } from '../../auth/AuthContext'

export function AdminContacts() {
  const { token } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadContacts = async (pageNum: number, search: string, status: string) => {
    if (!token) return
    setLoading(true)
    try {
      const response = await adminListContacts(token, {
        page: pageNum,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
      })
      setContacts(response.contacts)
      setPage(response.page)
      setTotalPages(response.totalPages)
      setError('')
    } catch (err) {
      console.error(err)
      setError('Unable to load contacts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContacts(1, '', '')
  }, [token])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setPage(1)
    loadContacts(1, value, statusFilter)
  }

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setStatusFilter(value)
    setPage(1)
    loadContacts(1, searchQuery, value)
  }

  const handlePaginationChange = (newPage: number) => {
    setPage(newPage)
    loadContacts(newPage, searchQuery, statusFilter)
  }

  const handleStatusChange = async (contact: Contact, newStatus: 'new' | 'read' | 'archived') => {
    if (!token) return
    setUpdating(contact.id)
    try {
      const updated = await adminUpdateContact(token, contact.id, { ...contact, status: newStatus })
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? updated : c)))
      setError('')
    } catch (err) {
      console.error(err)
      setError('Could not update contact status.')
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (contact: Contact) => {
    if (!token) return
    if (!confirm(`Delete contact from ${contact.email}?`)) return
    setDeleting(contact.id)
    try {
      await adminDeleteContact(token, contact.id)
      setContacts((prev) => prev.filter((c) => c.id !== contact.id))
      setError('')
    } catch (err) {
      console.error(err)
      setError('Could not delete contact.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="admin-pane">
      <div className="pane-head">
        <h1>Contact Form Submissions</h1>
      </div>

      {error && <p className="error">{error}</p>}

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={handleSearch}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
          <select
            value={statusFilter}
            onChange={handleStatusFilter}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
              minWidth: '150px',
            }}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#666' }}>Total: {contacts.length} submissions</p>
      </div>

      {loading && <p>Loading…</p>}

      {contacts.length === 0 && !loading && (
        <p style={{ textAlign: 'center', color: '#999', padding: '2rem 0' }}>No contacts found.</p>
      )}

      {contacts.length > 0 && (
        <>
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table className="admin-table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>{contact.name}</td>
                    <td>{contact.email}</td>
                    <td>{contact.subject}</td>
                    <td>{new Date(contact.createdAt).toLocaleDateString()}</td>
                    <td>
                      <select
                        value={contact.status}
                        onChange={(e) => handleStatusChange(contact, e.target.value as 'new' | 'read' | 'archived')}
                        disabled={updating === contact.id}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '3px',
                          fontSize: '0.875rem',
                          backgroundColor:
                            contact.status === 'new'
                              ? '#fff9e6'
                              : contact.status === 'read'
                                ? '#e6f3ff'
                                : '#f0f0f0',
                        }}
                      >
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="table-actions" style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          const message = `From: ${contact.name} <${contact.email}>${contact.phone ? `\nPhone: ${contact.phone}` : ''}\n\nSubject: ${contact.subject}\n\nMessage:\n${contact.message}`
                          alert(message)
                        }}
                      >
                        View
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={deleting === contact.id}
                        onClick={() => handleDelete(contact)}
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
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                className="btn btn-sm"
                disabled={page === 1}
                onClick={() => handlePaginationChange(page - 1)}
              >
                Previous
              </button>
              <span style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-sm"
                disabled={page >= totalPages}
                onClick={() => handlePaginationChange(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
