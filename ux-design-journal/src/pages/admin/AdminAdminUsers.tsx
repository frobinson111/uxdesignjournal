import { useEffect, useState } from 'react'
import { adminListUsers, adminCreateUser, adminDeleteUser, adminUpdateUserStatus, type AdminUser } from '../../api/admin'
import { useAuth } from '../../auth/AuthContext'

export function AdminAdminUsers() {
  const { token, email: currentUserEmail } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!token) return
      setLoading(true)
      try {
        const res = await adminListUsers(token)
        setUsers(res.users)
      } catch (err) {
        console.error(err)
        setError('Could not load admin users.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!newEmail.trim()) {
      setFormError('Email is required')
      return
    }
    if (!newEmail.includes('@')) {
      setFormError('Please enter a valid email address')
      return
    }
    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      const user = await adminCreateUser(token!, newEmail.trim(), newPassword)
      setUsers((prev) => [user, ...prev])
      setShowAddForm(false)
      setNewEmail('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error(err)
      setFormError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (user: AdminUser) => {
    if (!token) return
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    const action = newStatus === 'inactive' ? 'deactivate' : 'activate'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.email}?`)) return

    try {
      const updated = await adminUpdateUserStatus(token, user.id, newStatus)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to update user status')
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!token) return
    if (user.email === currentUserEmail) {
      setError('You cannot delete your own account')
      return
    }
    if (!confirm(`Delete admin user ${user.email}? This cannot be undone.`)) return

    try {
      await adminDeleteUser(token, user.id)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  return (
    <div className="admin-users-page">
      <div className="admin-page-header">
        <h1>Admin Users</h1>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          + Add Admin User
        </button>
      </div>

      {error && (
        <div className="admin-error" style={{ marginBottom: '1rem' }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '1rem' }}>Dismiss</button>
        </div>
      )}

      {showAddForm && (
        <div className="admin-modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Admin User</h2>
            <form onSubmit={handleAddUser}>
              {formError && <div className="admin-error">{formError}</div>}
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={saving}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : users.length === 0 ? (
        <p>No admin users found.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.email}
                  {user.email === currentUserEmail && <span className="badge-you"> (you)</span>}
                </td>
                <td>
                  <span className={`status-badge status-${user.status}`}>
                    {user.status}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="actions-cell">
                  <button
                    className={user.status === 'active' ? 'btn-warning' : 'btn-success'}
                    onClick={() => handleToggleStatus(user)}
                    disabled={user.email === currentUserEmail}
                    title={user.email === currentUserEmail ? 'Cannot modify your own account' : ''}
                  >
                    {user.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(user)}
                    disabled={user.email === currentUserEmail}
                    title={user.email === currentUserEmail ? 'Cannot delete your own account' : ''}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <style>{`
        .admin-users-page {
          padding: 0;
        }
        .admin-page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .admin-page-header h1 {
          margin: 0;
        }
        .admin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .admin-modal {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 400px;
          width: 90%;
        }
        .admin-modal h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .form-group input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
        }
        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }
        .badge-you {
          color: #666;
          font-size: 0.85em;
        }
        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
          text-transform: capitalize;
        }
        .status-active {
          background: #d4edda;
          color: #155724;
        }
        .status-inactive {
          background: #f8d7da;
          color: #721c24;
        }
        .actions-cell {
          display: flex;
          gap: 0.5rem;
        }
        .btn-warning {
          background: #ffc107;
          color: #212529;
          border: none;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-warning:hover {
          background: #e0a800;
        }
        .btn-warning:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-success {
          background: #28a745;
          color: white;
          border: none;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-success:hover {
          background: #218838;
        }
        .btn-success:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-danger {
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-danger:hover {
          background: #c82333;
        }
        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-primary {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-primary:hover {
          background: #0069d9;
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .admin-error {
          background: #f8d7da;
          color: #721c24;
          padding: 0.75rem 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  )
}
