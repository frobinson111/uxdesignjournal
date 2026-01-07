import { NewsletterForm } from '../components/NewsletterForm'

export function SubscribePage() {
  return (
    <div className="wrap section">
      <header className="category-header">
        <p className="eyebrow">Subscribe</p>
        <h1>Stay current with the Journal</h1>
      </header>
      <NewsletterForm />
    </div>
  )
}


