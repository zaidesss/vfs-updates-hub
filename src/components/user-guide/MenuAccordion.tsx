import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LucideIcon } from 'lucide-react';

interface MenuAccordionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function MenuAccordion({ id, icon: Icon, title, description, children, defaultOpen }: MenuAccordionProps) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? id : undefined}>
      <AccordionItem value={id} className="border rounded-lg">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-base">{title}</p>
              <p className="text-sm text-muted-foreground font-normal">{description}</p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-6 pt-2">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
