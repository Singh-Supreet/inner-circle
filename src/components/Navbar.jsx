import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar__brand">
        <svg className="navbar__logo" width="38" height="34" viewBox="0 0 38 34" fill="none">
          <circle cx="13" cy="14" r="11.5" stroke="white" strokeWidth="2.5" />
          <circle cx="25" cy="14" r="11.5" stroke="white" strokeWidth="2.5" />
        </svg>
        <div className="navbar__tagline">
          <span>Full Workflow Automation.</span>
          <span>We Manage Everything.</span>
          <span>You Unwind.</span>
        </div>
      </div>
      <ul className="navbar__links">
        {['Projects', 'Expertise', 'About', 'Manifesto'].map((item) => (
          <li key={item}>
            <a href={`#${item.toLowerCase()}`}>{item}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
