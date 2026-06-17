import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="logo-mark" aria-label="Inner Circle">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="16" stroke="white" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="9" stroke="white" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="18" cy="18" r="3.5" fill="white" />
          </svg>
        </div>
        <div className="tagline">
          <span>Full Workflow Automation.</span>
          <span>We Manage Everything.</span>
          <span>You Unwind.</span>
        </div>
      </div>

      <ul className="nav-links" role="list">
        <li><a href="#projects">Projects</a></li>
        <li><a href="#expertise">Expertise</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#manifesto">Manifesto</a></li>
      </ul>
    </nav>
  )
}
