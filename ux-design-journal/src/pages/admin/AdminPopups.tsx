import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { adminListPopups, adminSavePopup, adminDeletePopup } from '../../api/admin'

interface PopupConfig {
  id?: string
  name: string
  title: string
  description: string
  imageUrl: string
  imageCaption: string
  pdfUrl: string
  pdfTitle: string
  buttonText: string
  delaySeconds: number
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export function AdminPopups() {
  const { token } = useAuth()
  const [popups, setPopups] = useState<PopupConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPopup, setEditingPopup] = useState<PopupConfig | null>(null)
  const [showForm, setShowForm] = useState(false)

  const loadPopups = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await adminListPopups(token)
      setPopups(data.popups || [])
    } catch (err) {
      console.error('Failed to load popups:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPopups()
  }, [token])

  const handleEdit = (popup: PopupConfig) => {
    setEditingPopup(popup)
    setShowForm(true)
  }

  const handleNew = () => {
    setEditingPopup({
      name: '',
      title: '',
      description: '',
      imageUrl: '',
      imageCaption: '',
      pdfUrl: '',
      pdfTitle: '',
      buttonText: 'Get Download Link',
      delaySeconds: 15,
      active: false,
    })
    setShowForm(true)
  }

  const handleSave = async (popup: PopupConfig) => {
    if (!token) return
    try {
      await adminSavePopup(token, popup)
      setShowForm(false)
      setEditingPopup(null)
      loadPopups()
    } catch (err) {
      console.error('Failed to save popup:', err)
      alert('Failed to save popup')
    }
  }

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this popup? All associated leads will also be deleted.')) return
    try {
      await adminDeletePopup(token, id)
      loadPopups()
    } catch (err) {
      console.error('Failed to delete popup:', err)
      alert('Failed to delete popup')
    }
  }

  if (loading) return <div>Loading...</div>

  if (showForm && editingPopup) {
    return (
      <PopupForm
        popup={editingPopup}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false)
          setEditingPopup(null)
        }}
      />
    )
  }

  return (
    <div className="admin-section">
      <div className="admin-header">
        <h1>Lead Capture Popups</h1>
        <button onClick={handleNew} className="btn-primary">
          Create New Popup
        </button>
      </div>

      {popups.length === 0 ? (
        <p>No popups created yet. Create your first popup to start collecting leads.</p>
      ) : (
        <div className="popup-list">
          {popups.map((popup) => (
            <div key={popup.id} className={`popup-card ${popup.active ? 'active' : ''}`}>
              {popup.imageUrl && (
                <img src={popup.imageUrl} alt={popup.name} className="popup-thumbnail" />
              )}
              <div className="popup-info">
                <h3>{popup.name}</h3>
                <p className="popup-title">{popup.title}</p>
                <div className="popup-meta">
                  <span>Delay: {popup.delaySeconds}s</span>
                  <span className={`status ${popup.active ? 'active' : 'inactive'}`}>
                    {popup.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="popup-actions">
                <button onClick={() => handleEdit(popup)} className="btn-secondary">
                  Edit
                </button>
                <button onClick={() => popup.id && handleDelete(popup.id)} className="btn-danger">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .popup-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .popup-card {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          align-items: center;
        }
        
        .popup-card.active {
          border-color: #28a745;
          background: #f0f9f4;
        }
        
        .popup-thumbnail {
          width: 120px;
          height: 80px;
          object-fit: cover;
          border-radius: 4px;
        }
        
        .popup-info {
          flex: 1;
        }
        
        .popup-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.125rem;
        }
        
        .popup-title {
          margin: 0 0 0.5rem 0;
          color: #666;
          font-size: 0.9rem;
        }
        
        .popup-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
        }
        
        .popup-meta .status {
          padding: 0.125rem 0.5rem;
          border-radius: 3px;
          font-weight: 600;
        }
        
        .popup-meta .status.active {
          background: #28a745;
          color: white;
        }
        
        .popup-meta .status.inactive {
          background: #6c757d;
          color: white;
        }
        
        .popup-actions {
          display: flex;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  )
}

function PopupForm({ popup, onSave, onCancel }: {
  popup: PopupConfig
  onSave: (popup: PopupConfig) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(popup)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="admin-section">
      <div className="admin-header">
        <h1>{popup.id ? 'Edit Popup' : 'Create New Popup'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="popup-form">
        <div className="form-group">
          <label htmlFor="name">Internal Name *</label>
          <input
            type="text"
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="e.g., UX Guide Spring 2026"
          />
        </div>

        <div className="form-group">
          <label htmlFor="title">Popup Title *</label>
          <input
            type="text"
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            placeholder="e.g., Free UX Design Resources"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Describe what the user will get..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="imageUrl">Image URL</label>
            <input
              type="url"
              id="imageUrl"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="form-group">
            <label htmlFor="imageCaption">Image Caption</label>
            <input
              type="text"
              id="imageCaption"
              value={form.imageCaption}
              onChange={(e) => setForm({ ...form, imageCaption: e.target.value })}
              placeholder="Optional caption"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="pdfUrl">PDF Download URL *</label>
          <input
            type="url"
            id="pdfUrl"
            value={form.pdfUrl}
            onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
            required
            placeholder="https://example.com/download/guide.pdf"
          />
        </div>

        <div className="form-group">
          <label htmlFor="pdfTitle">PDF Title *</label>
          <input
            type="text"
            id="pdfTitle"
            value={form.pdfTitle}
            onChange={(e) => setForm({ ...form, pdfTitle: e.target.value })}
            required
            placeholder="e.g., The Complete UX Design Guide"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="buttonText">Button Text</label>
            <input
              type="text"
              id="buttonText"
              value={form.buttonText}
              onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
              placeholder="Get Download Link"
            />
          </div>

          <div className="form-group">
            <label htmlFor="delaySeconds">Delay (seconds)</label>
            <input
              type="number"
              id="delaySeconds"
              value={form.delaySeconds}
              onChange={(e) => setForm({ ...form, delaySeconds: parseInt(e.target.value) || 10 })}
              min="0"
              max="120"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <span>Active (only one popup can be active at a time)</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save Popup
          </button>
        </div>
      </form>

      <style>{`
        .popup-form {
          max-width: 800px;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        
        .checkbox-label input {
          width: auto;
        }
        
        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #ddd;
        }
      `}</style>
    </div>
  )
}
