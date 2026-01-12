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
    { to: '/admin/contacts', label: 'Contacts' },
    { to: '/admin/subscribers', label: 'Subscribers' },
    { to: '/admin/admin-users', label: 'Admin Users' },
  ]

  const isLinkActive = (linkPath: string): boolean => {
    // Exact match for Dashboard
    if (linkPath === '/admin') {
      return pathname === '/admin'
    }
    
    // Exact match for New Article
    if (linkPath === '/admin/articles/new') {
      return pathname === '/admin/articles/new'
    }
    
    // Articles link is active for /articles and /articles/:slug (edit), but not /articles/new
    if (linkPath === '/admin/articles') {
      return pathname.startsWith('/admin/articles') && pathname !== '/admin/articles/new'
    }
    
    // Exact match for all other links
    return pathname === linkPath
  }

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="admin-brand">UXDJ Admin</div>
        <nav>
          <ul>
            {links.map((l) => (
              <li key={l.to} className={isLinkActive(l.to) ? 'active' : ''}>
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

