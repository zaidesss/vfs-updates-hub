import { GuideSection, CalloutBox, Checklist, QuickTable } from '../GuideComponents';

export function KnowledgeBaseSection() {
  return (
    <>
      <GuideSection letter="R" color="bg-rose-500" title="Knowledge Base - Main Page">
        <p className="text-muted-foreground mb-4">
          The Knowledge Base is a searchable library of all published updates organized by category.
        </p>

        <h3 className="font-semibold mb-2">Main Page Features</h3>
        <Checklist items={[
          "Search bar at the top for quick searches.",
          "Category grid showing all 10 categories.",
          "Each category shows article count.",
          "Recent Updates section showing 5 most recent articles.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Search Behavior</h3>
        <QuickTable 
          headers={['Feature', 'How It Works']}
          rows={[
            ['Real-time filtering', 'Results appear as you type.'],
            ['Search scope', 'Searches title and summary text.'],
            ['Results dropdown', 'Matches appear below the search box.'],
            ['Navigation', 'Click a result to go to the update detail page.'],
          ]}
        />

        <CalloutBox variant="tip">
          Use specific keywords when searching. The search checks both the title and summary of each update.
        </CalloutBox>
      </GuideSection>

      <GuideSection letter="S" color="bg-rose-400" title="Knowledge Base - Category Articles">
        <p className="text-muted-foreground mb-4">
          Clicking on a category opens the Category Articles page showing all updates in that category.
        </p>

        <h3 className="font-semibold mb-2">Page Features</h3>
        <Checklist items={[
          "Breadcrumb navigation (Knowledge Base > Category Name).",
          "Back button to return to Knowledge Base.",
          "Category-specific search bar.",
          "List of articles in the selected category.",
          "Each article shows title, summary, posted date, and author.",
        ]} />

        <h3 className="font-semibold mb-2 mt-4">Article Card Display</h3>
        <QuickTable 
          headers={['Element', 'Description']}
          rows={[
            ['Title', 'Main headline of the update.'],
            ['Summary', 'Brief description of the content.'],
            ['Posted Date', 'When the update was published.'],
            ['Author', 'Who created the update.'],
          ]}
        />
      </GuideSection>
    </>
  );
}
