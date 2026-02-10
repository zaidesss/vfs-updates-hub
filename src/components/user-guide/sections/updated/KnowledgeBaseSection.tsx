import { GuideImagePlaceholder } from '../../GuideImagePlaceholder';

export function KnowledgeBaseSection() {
  return (
    <div className="space-y-8 text-sm leading-relaxed">
      {/* 1. Overview */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">1. What is the Knowledge Base?</h3>
        <p className="text-muted-foreground">
          The Knowledge Base is a read-only reference library that surfaces all <strong>published</strong> updates as browsable articles, organized by category. It complements the Updates page — while Updates focuses on acknowledgement tracking, the Knowledge Base focuses on <strong>discovery and search</strong>.
        </p>
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-blue-800 dark:text-blue-200 font-medium text-xs">💡 Data Source</p>
          <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
            The Knowledge Base pulls from the same data as the Updates page. Only updates with a <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">published</code> status appear. Draft, Archived, and Obsolete updates are excluded.
          </p>
        </div>
        <GuideImagePlaceholder description="Knowledge Base landing page showing search bar, category grid, and recent updates" />
      </section>

      {/* 2. Navigation & Access */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">2. Navigation & Access</h3>
        <p className="text-muted-foreground">
          Accessible via the sidebar under <strong>Knowledge Base</strong>. All roles (User, HR, Admin, Super Admin) have full read access. There are no role-based restrictions on viewing articles.
        </p>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="font-medium text-foreground text-xs">URL Structure</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
            <li><code className="bg-muted px-1 rounded">/knowledge-base</code> — Main landing page with category grid</li>
            <li><code className="bg-muted px-1 rounded">/knowledge-base/:category</code> — Category article listing (e.g., <code className="bg-muted px-1 rounded">/knowledge-base/orders_transactions</code>)</li>
            <li><code className="bg-muted px-1 rounded">/updates/:id</code> — Individual article detail (classic markdown view)</li>
            <li><code className="bg-muted px-1 rounded">/knowledge-base/:category/playbook/:id</code> — Structured playbook article view</li>
          </ul>
        </div>
      </section>

      {/* 3. Landing Page */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">3. Landing Page Layout</h3>
        <p className="text-muted-foreground">The landing page has three sections:</p>

        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-foreground text-sm">3a. Global Search Bar</h4>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
              <li>Centered at the top of the page</li>
              <li>Searches across <strong>title</strong> and <strong>summary</strong> fields of all published updates</li>
              <li>Results appear in a dropdown overlay (max 10 results)</li>
              <li>Each result links directly to <code className="bg-muted px-1 rounded">/updates/:id</code></li>
              <li>Dropdown disappears when the search field is cleared</li>
            </ul>
            <GuideImagePlaceholder description="Search bar with dropdown results showing matched article titles" />
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-foreground text-sm">3b. Category Grid</h4>
            <p className="text-muted-foreground text-xs">
              Displays all 10 update categories as clickable cards in a responsive grid (1 / 2 / 3 columns). Each card shows:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
              <li><strong>Category name</strong> — e.g., "Orders & Transactions"</li>
              <li><strong>Article count</strong> — number of published updates in that category</li>
              <li>Clicking navigates to <code className="bg-muted px-1 rounded">/knowledge-base/:category</code></li>
            </ul>
            <div className="mt-2">
              <p className="font-medium text-foreground text-xs mb-1">Available Categories:</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <span>• Orders & Transactions</span>
                <span>• Payments & Billing</span>
                <span>• Shipping & Tracking</span>
                <span>• Delivery Issues</span>
                <span>• International & Customs</span>
                <span>• Product Issues</span>
                <span>• Product Information</span>
                <span>• Subscriptions</span>
                <span>• Warehouse & Fulfillment</span>
                <span>• Internal Operations</span>
              </div>
            </div>
            <GuideImagePlaceholder description="Category grid showing cards with labels and article counts" />
          </div>

          <div className="border border-border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-foreground text-sm">3c. Recent Updates</h4>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
              <li>Shows the <strong>5 most recently published</strong> updates across all categories</li>
              <li>Each row displays: title, summary (1-line truncated), and relative timestamp (e.g., "3 days ago")</li>
              <li>Clicking navigates to <code className="bg-muted px-1 rounded">/updates/:id</code></li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Category Article Listing */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">4. Category Article Listing</h3>
        <p className="text-muted-foreground">
          When you click a category card, you see a filtered list of all published updates in that category.
        </p>

        <div className="space-y-2">
          <h4 className="font-semibold text-foreground text-sm">Page Elements</h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
            <li><strong>Breadcrumb navigation</strong> — "Knowledge Base → [Category Name]"</li>
            <li><strong>"Back to Knowledge Base"</strong> link at the top</li>
            <li><strong>Category-scoped search</strong> — filters within the current category only</li>
            <li><strong>Article count</strong> — e.g., "12 articles in this category"</li>
            <li><strong>Article list</strong> — sorted newest first, showing title, summary (2-line clamp), timestamp, and author</li>
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-amber-800 dark:text-amber-200 font-medium text-xs">⚠️ Invalid Category</p>
          <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
            If a user navigates to an invalid category slug (e.g., <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">/knowledge-base/invalid</code>), they are automatically redirected back to the Knowledge Base landing page.
          </p>
        </div>

        <GuideImagePlaceholder description="Category article listing page with breadcrumb, search, and article rows" />
      </section>

      {/* 5. Article Formats */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">5. Article Formats</h3>
        <p className="text-muted-foreground">
          Articles can be viewed in two formats depending on how they were created:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-semibold text-foreground">Format</th>
                <th className="text-left p-2 font-semibold text-foreground">Detection</th>
                <th className="text-left p-2 font-semibold text-foreground">View Route</th>
                <th className="text-left p-2 font-semibold text-foreground">Features</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="p-2 font-medium">Markdown (Classic)</td>
                <td className="p-2">Body is plain text / markdown</td>
                <td className="p-2"><code className="bg-muted px-1 rounded">/updates/:id</code></td>
                <td className="p-2">Rich text, headers, lists, code blocks</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 font-medium">Playbook (Structured)</td>
                <td className="p-2">Body is JSON with <code className="bg-muted px-1 rounded">title</code> + <code className="bg-muted px-1 rounded">sections</code></td>
                <td className="p-2"><code className="bg-muted px-1 rounded">/knowledge-base/:cat/playbook/:id</code></td>
                <td className="p-2">Sections, checklists, message templates, timelines, image galleries, callout boxes</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="font-medium text-foreground text-xs mb-1">Auto-Detection Logic</p>
          <p className="text-muted-foreground text-xs">
            When a Playbook article URL is visited, the system attempts to parse the update body as JSON. If it contains both a <code className="bg-muted px-1 rounded">title</code> and <code className="bg-muted px-1 rounded">sections</code> property, the structured Playbook view renders. Otherwise, a fallback message displays with a "View in Classic Mode" button linking to the markdown view.
          </p>
        </div>

        <GuideImagePlaceholder description="Side-by-side comparison of Markdown article vs Playbook structured article" />
      </section>

      {/* 6. Playbook Components */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">6. Playbook Article Components</h3>
        <p className="text-muted-foreground">
          Structured Playbook articles support a rich set of components that admins can compose via JSON:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { name: 'PlaybookSection', desc: 'Main content section with title and body text' },
            { name: 'Checklist', desc: 'Interactive checkbox list for procedural steps' },
            { name: 'MessageTemplate', desc: 'Pre-written response templates agents can reference' },
            { name: 'TimelineSection', desc: 'Chronological event sequence with timestamps' },
            { name: 'ImageGallery', desc: 'Grid of images with lightbox viewing' },
            { name: 'CalloutBox', desc: 'Highlighted info/warning/tip blocks' },
            { name: 'StepsSection', desc: 'Numbered procedural steps with descriptions' },
            { name: 'InfoCard', desc: 'Compact info panel with key-value data' },
            { name: 'RoleCard', desc: 'Role-specific instruction cards' },
            { name: 'DocumentLink', desc: 'Linked reference to external documents' },
            { name: 'SectionMarker', desc: 'Visual divider between major sections' },
          ].map(comp => (
            <div key={comp.name} className="bg-muted/30 rounded p-2 text-xs">
              <span className="font-mono font-medium text-foreground">{comp.name}</span>
              <span className="text-muted-foreground ml-1">— {comp.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Search Behavior */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">7. Search Behavior Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-semibold text-foreground">Feature</th>
                <th className="text-left p-2 font-semibold text-foreground">Landing Page Search</th>
                <th className="text-left p-2 font-semibold text-foreground">Category Page Search</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="p-2 font-medium">Scope</td>
                <td className="p-2">All published updates</td>
                <td className="p-2">Current category only</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 font-medium">Fields searched</td>
                <td className="p-2">Title + Summary</td>
                <td className="p-2">Title + Summary</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 font-medium">Max results</td>
                <td className="p-2">10 (dropdown)</td>
                <td className="p-2">All matches (inline)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2 font-medium">Display</td>
                <td className="p-2">Floating dropdown overlay</td>
                <td className="p-2">Filters the existing article list</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 8. Relationship to Updates */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">8. Relationship to Updates Page</h3>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold text-foreground">Aspect</th>
                  <th className="text-left p-2 font-semibold text-foreground">Updates Page</th>
                  <th className="text-left p-2 font-semibold text-foreground">Knowledge Base</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border">
                  <td className="p-2 font-medium">Purpose</td>
                  <td className="p-2">Track & acknowledge new changes</td>
                  <td className="p-2">Browse & search reference articles</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-2 font-medium">Acknowledgement</td>
                  <td className="p-2">Yes — required per user</td>
                  <td className="p-2">No — read-only browsing</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-2 font-medium">Questions</td>
                  <td className="p-2">Yes — threaded Q&A</td>
                  <td className="p-2">No</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-2 font-medium">Admin tools</td>
                  <td className="p-2">Create, edit, status management</td>
                  <td className="p-2">None (read-only)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-2 font-medium">Filtering</td>
                  <td className="p-2">Unread/Read tabs + category dropdown</td>
                  <td className="p-2">Category navigation + search</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
