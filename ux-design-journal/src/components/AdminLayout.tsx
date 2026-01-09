import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function AdminLayout() {
  const { email, logout } = useAuth()
  const { pathname } = useLocation()
  const links = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/articles', label: 'Articles' },
    { to: '/admin/articles/new', label: 'New Article' },
    { to: '/admin/ai', label: 'Generate with AI' },
    { to: '/admin/ads', label: 'Ads' },
    { to: '/admin/users', label: 'Users' },
  ]

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="admin-brand">UXDJ Admin</div>
        <nav>
          <ul>
            {links.map((l) => (
              <li key={l.to} className={pathname.startsWith(l.to.replace('/new','')) ? 'active' : ''}>
                <Link to={l.to}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="admin-user">
          <div className="admin-user-email">{email}</div>
          <button onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}

