import { MenuAccordion } from './MenuAccordion';
import { Shield } from 'lucide-react';
import { UpdatedRolesSection } from './sections/updated/RolesSection';

export function UpdatedUserGuideContent() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Updated User Guide</h2>
        <p className="text-muted-foreground">
          Extremely detailed, step-by-step documentation for every portal feature. Each section includes image placeholders where screenshots will be added.
        </p>
      </div>

      <MenuAccordion
        id="roles"
        icon={Shield}
        title="User Roles & Permissions"
        description="Role definitions, feature access matrix, restrictions, and escalation rules"
        defaultOpen
      >
        <UpdatedRolesSection />
      </MenuAccordion>

      {/* Future sections will be added here one at a time */}
    </div>
  );
}
