import { Routes, Route } from 'react-router-dom'
import './App.css'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { CategoryPage } from './pages/CategoryPage'
import { ArticlePage } from './pages/ArticlePage'
import { ArchivePage } from './pages/ArchivePage'
import { SearchPage } from './pages/SearchPage'
import { SubscribePage } from './pages/SubscribePage'
import { EditorialPage } from './pages/EditorialPage'
import { useCategories } from './hooks/useCategories'
import { useEngagedTimer } from './hooks/useEngagedTimer'
import { EmailGateModal } from './components/EmailGateModal'
import { AdminLogin } from './pages/admin/AdminLogin'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/AdminLayout'
import { AdminArticlesList } from './pages/admin/AdminArticlesList'
import { AdminArticleEdit } from './pages/admin/AdminArticleEdit'
import { AdminAIGenerate } from './pages/admin/AdminAIGenerate'
import { AdminAds } from './pages/admin/AdminAds'

function App() {
  const { categories } = useCategories()
  const { open, dismiss, markIdentified } = useEngagedTimer()

  return (
    <>
      <Layout categories={categories}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="/editorial" element={<EditorialPage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
          <Route path="/:categorySlug" element={<CategoryPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/*" element={<AdminLayout />}>
              <Route path="articles" element={<AdminArticlesList />} />
              <Route path="articles/new" element={<AdminArticleEdit />} />
              <Route path="articles/:slug" element={<AdminArticleEdit />} />
              <Route path="ai" element={<AdminAIGenerate />} />
              <Route path="ads" element={<AdminAds />} />
            </Route>
          </Route>
        </Routes>
      </Layout>

      <EmailGateModal open={open} onClose={dismiss} onIdentified={markIdentified} />
    </>
  )
}

export default App
