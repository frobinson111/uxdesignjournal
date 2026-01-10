import frankImage from '../assets/images/founder/frank-robinson.svg'


export function AboutPage() {
  return (
    <div className="wrap section about-page">
      <header className="category-header">
        <p className="eyebrow">About</p>
        <h1>About the Publication</h1>
      </header>

      <div className="about-page-content">
        {/* Main Content Column */}
        <div className="about-page-main">
          <div className="prose">
            <p>
              UX Design Journal publishes essays, analyses, and field notes for UX designers who deal with real constraints:
              timelines, stakeholders, compliance, ambiguity, and the uncomfortable gap between theory and production.
            </p>
            <p><strong>This is not a trend blog.</strong></p>
            <p><strong>This is not thought-leadership cosplay.</strong></p>
            <p>
              Every publication is designed to help working designers sharpen judgment, reduce risk, and make better decisions
              before work ships.
            </p>

            <h2>What We Publish</h2>

            <h3>Design Practice</h3>
            <p>Clear thinking about how design actually happens in organizations.</p>
            <ul>
              <li>Design critique and decision-making</li>
              <li>Navigating tradeoffs, constraints, and ambiguity</li>
              <li>Applying theory without becoming unbearable about it</li>
            </ul>
            <p><strong>Typical reads:</strong></p>
            <ul>
              <li>"When usability testing is politically impossible"</li>
              <li>"Design systems don't fail. Incentives do."</li>
            </ul>

            <h3>Design Review &amp; Critique</h3>
            <p>How to evaluate work without ego, guesswork, or performative confidence.</p>
            <ul>
              <li>Review frameworks and mental models</li>
              <li>Spotting blind spots before stakeholders do</li>
              <li>Separating taste from risk</li>
            </ul>
            <p><strong>Typical reads:</strong></p>
            <ul>
              <li>"What a design review should catch but rarely does"</li>
              <li>"Why 'looks good' is not feedback"</li>
            </ul>

            <h3>Career</h3>
            <p>Long-arc thinking for designers who plan to stay in the field.</p>
            <ul>
              <li>Senior and staff-level expectations</li>
              <li>Career durability, not hype cycles</li>
              <li>Decision-making under pressure</li>
            </ul>
            <p><strong>Typical reads:</strong></p>
            <ul>
              <li>"Senior designers don't move faster. They pause earlier."</li>
              <li>"The career cost of shipping the wrong thing confidently"</li>
            </ul>

            <h3>Signals</h3>
            <p>Early indicators worth paying attention to. Not trends for clicks.</p>
            <ul>
              <li>Shifts in tools, workflows, and org structure</li>
              <li>AI's real impact on design work (not demos)</li>
              <li>What experienced teams are quietly changing</li>
            </ul>
            <p><strong>Typical reads:</strong></p>
            <ul>
              <li>"Why AI accelerates mistakes before it improves quality"</li>
              <li>"What teams stop doing when design matures"</li>
            </ul>
          </div>
        </div>

        {/* Founder Sidebar */}
        <aside className="about-page-sidebar">
          <div className="founder-card">
            <img 
              src="/Frank-Robinson-UX.jpg" 
              alt="Frank Robinson III Sr." 
              className="founder-image"
              style={{ width: '100%', maxWidth: '320px', display: 'block', margin: '0 auto 1rem auto' }}
            />
            <p className="founder-title" style={{ textAlign: 'center' }}>Founder &amp; Editor</p>
            <h3 className="founder-name" style={{ textAlign: 'left', marginBottom: '-1rem' }}>Frank Robinson III</h3>
            <p className="founder-title" style={{ textTransform: 'none', fontSize: '0.95rem', fontWeight: 500, textAlign: 'left' }}>
              Sr. UX Product Designer
            </p>
            <div className="founder-bio" style={{ textAlign: 'left' }}>
              <p>
                Innovative and user-focused Senior UX/UI Product Designer with over 10 years of experience designing and delivering exceptional web and mobile experiences. Proven expertise in translating complex business needs into intuitive, accessible, and user-centric designs.
              </p>
              <p>
                Adept at leveraging qualitative and quantitative research insights to inform design decisions, develop MVPs, and enhance user outcomes.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
