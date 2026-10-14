import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="not-found-container">

      {/* Minimal top nav echoing the reference image */}
      <nav className="not-found-nav">
        <Link to="/">Home</Link>
        <Link to="/">Trips</Link>
        <Link to="/profile">Profile</Link>
        <Link to="/admin">Admin</Link>
      </nav>

      <div className="not-found-card">
        {/* Giant gradient "404" that fades into the clouds below */}
        <h1 className="not-found-title">404</h1>

        <h2 className="not-found-subtitle">Sorry, that page could not be found</h2>
        <p className="not-found-caption">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>

        <Link to="/" className="not-found-btn">Go Back Home</Link>
      </div>
    </div>
  )
}
