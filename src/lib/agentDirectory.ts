// Agent directory data extracted from MASTERDIRECTORY and ROSTER CSVs

export interface AgentInfo {
  name: string;
  position: string;
  teamLead: string;
  clients: string[];
}

// Agent directory keyed by email (lowercase)
export const AGENT_DIRECTORY: Record<string, AgentInfo> = {
  'taosfoodservices@gmail.com': { name: 'Adelyn Torralba', position: 'Chat', teamLead: 'Juno Dianne Garciano', clients: ['PersistBrands'] },
  'vivarezbia@gmail.com': { name: 'Biah Mae Divinagracia', position: 'Email', teamLead: 'Meryl Jean Iman', clients: ['PersistBrands'] },
  'c.invidiado27@gmail.com': { name: 'Charles Josef Invidiado', position: 'Agent', teamLead: '', clients: ['ReachOut'] },
  'descataytay.26@gmail.com': { name: 'Desiree Cataytay', position: 'Hybrid', teamLead: 'Meryl Jean Iman', clients: ['PersistBrands'] },
  'divinabonjeobera@gmail.com': { name: 'Divine Grace Obrera', position: 'Hybrid', teamLead: 'Juno Dianne Garciano', clients: ['PersistBrands'] },
  'elaineumalicenteno@gmail.com': { name: 'Elaine Centeno', position: 'Phone', teamLead: 'Meryl Jean Iman', clients: ['PersistBrands'] },
  'hannhash1607@gmail.com': { name: 'Ellen Eugenio', position: 'Phone', teamLead: 'Jaeran Sanchez', clients: ['PersistBrands'] },
  'erikarheasantiago123@gmail.com': { name: 'Erika Rhea Santiago', position: 'Email', teamLead: 'Jaeran Sanchez', clients: ['PersistBrands'] },
  'grejdaquipil@gmail.com': { name: 'Grejah Daquipil', position: 'Hybrid', teamLead: 'Meryl Jean Iman', clients: ['PersistBrands'] },
  'jaeransanchez@gmail.com': { name: 'Jaeran Sanchez', position: 'Team Lead', teamLead: 'Patrick Argao', clients: ['PersistBrands'] },
  'jane.evangelista040113@gmail.com': { name: 'Jane Evangelista', position: 'Agent', teamLead: '', clients: ['Tyler Gehrs'] },
  'jannahdelacruz21@gmail.com': { name: 'Jannah Bugayong', position: 'Phone', teamLead: 'Meryl Jean Iman', clients: ['PersistBrands'] },
  'ochoajazmincjay@gmail.com': { name: 'Jazmin Ochoa', position: 'Agent', teamLead: '', clients: ['Eazey'] },
  'missjenn.organizedme@gmail.com': { name: 'Jennifer Katigbak', position: 'Hybrid', teamLead: 'Meryl Jean Iman', clients: ['PersistBrands'] },
  'jessieargao.24@gmail.com': { name: 'Jesse Argao', position: 'Logistics', teamLead: 'Kristin Joann Argao', clients: ['PersistBrands'] },
  'ortega.jkr@gmail.com': { name: 'Jonnilene Kay Ortega', position: 'Agent', teamLead: '', clients: ['Online Research Pro'] },
  'dzaydee06@gmail.com': { name: 'Juno Dianne Garciano', position: 'Team Lead', teamLead: 'Patrick Argao', clients: ['PersistBrands'] },
  'kimberlytlacaden@gmail.com': { name: 'Kimberly Lacaden', position: 'Hybrid', teamLead: 'Meryl Jean Iman', clients: ['PersistBrands'] },
  'joanargao@gmail.com': { name: 'Kristin Joann Argao', position: 'Team Lead', teamLead: 'Patrick Argao', clients: ['PersistBrands', 'ReachOut'] },
  'lemmsj@gmail.com': { name: 'Lauro Ednalaga', position: 'Logistics', teamLead: 'Kristin Joann Argao', clients: ['PersistBrands'] },
  'ethangreytrangia29@gmail.com': { name: 'Louela Trangia', position: 'Logistics', teamLead: 'Kristin Joann Argao', clients: ['PersistBrands'] },
  'ren.freenlancing@gmail.com': { name: 'Marc Lawrence Magadan', position: 'Tech', teamLead: 'Patrick Argao', clients: ['PersistBrands'] },
  'salmeromalcomeduc@gmail.com': { name: 'Malcom Joseph Vincent Salmero', position: 'Tech', teamLead: 'Patrick Argao', clients: ['BitMob', 'PersistBrands'] },
  'mjesguerraiman@gmail.com': { name: 'Meryl Jean Iman', position: 'Team Lead', teamLead: 'Patrick Argao', clients: ['PersistBrands'] },
  'ignacionikki7@gmail.com': { name: 'Nikki Ignacio', position: 'Hybrid', teamLead: 'Juno Dianne Garciano', clients: ['PersistBrands'] },
  'khrysothemismarketing@gmail.com': { name: 'Noelle Patrick dela Cruz', position: 'Hybrid', teamLead: 'Meryl Jean Iman', clients: ['PersistBrands'] },
  'patrickargao@gmail.com': { name: 'Patrick Argao', position: 'Team Lead', teamLead: 'Patrick Argao', clients: ['PersistBrands'] },
  'paulinecarbajosa0713@gmail.com': { name: 'Pauline Desabilla', position: 'Hybrid', teamLead: 'Jaeran Sanchez', clients: ['PersistBrands'] },
  'preciousgagarra21@gmail.com': { name: 'Precious Mae Gagarra', position: 'Hybrid', teamLead: 'Jaeran Sanchez', clients: ['PersistBrands'] },
  'joydocto56@gmail.com': { name: 'Rezajoy Docto', position: 'Chat', teamLead: 'Juno Dianne Garciano', clients: ['PersistBrands'] },
  'laraine.lopez@gmail.com': { name: 'Richelle Cayabyab', position: 'Hybrid', teamLead: 'Juno Dianne Garciano', clients: ['PersistBrands'] },
  'ruthgajo97@gmail.com': { name: 'Ruth Gajo', position: 'Email', teamLead: 'Jaeran Sanchez', clients: ['PersistBrands'] },
  'bautista.sarahmae333@gmail.com': { name: 'Sarah Mae Bautista', position: 'Chat', teamLead: 'Jaeran Sanchez', clients: ['PersistBrands'] },
  'merfmartinez15@gmail.com': { name: 'Stephen Martinez', position: 'Email', teamLead: 'Juno Dianne Garciano', clients: ['PersistBrands'] },
  'arancillotrish06@gmail.com': { name: 'Trisha Nicolle Arancillo', position: 'Hybrid', teamLead: 'Jaeran Sanchez', clients: ['PersistBrands'] },
  'willangelinereyes@gmail.com': { name: 'Will Reyes', position: 'Hybrid', teamLead: 'Jaeran Sanchez', clients: ['PersistBrands'] },
};

// All unique client options from ROSTER
export const CLIENT_OPTIONS = [
  'PersistBrands',
  'ReachOut',
  'Tyler Gehrs',
  'Eazey',
  'Online Research Pro',
  'BitMob'
];

// Lookup function to get agent info by email
export function getAgentInfoByEmail(email: string): AgentInfo | null {
  if (!email) return null;
  return AGENT_DIRECTORY[email.toLowerCase().trim()] ?? null;
}

// Get clients for a specific agent
export function getAgentClients(email: string): string[] {
  const agentInfo = getAgentInfoByEmail(email);
  return agentInfo?.clients ?? CLIENT_OPTIONS;
}

// Get unique team leads sorted alphabetically
export function getUniqueTeamLeads(): string[] {
  const leads = new Set<string>();
  Object.values(AGENT_DIRECTORY).forEach(agent => {
    if (agent.teamLead && agent.teamLead.trim()) {
      leads.add(agent.teamLead.trim());
    }
  });
  return Array.from(leads).sort();
}

// Get agent emails that belong to a specific team lead
export function getAgentEmailsByTeamLead(teamLead: string): string[] {
  return Object.entries(AGENT_DIRECTORY)
    .filter(([_, agent]) => agent.teamLead === teamLead)
    .map(([email]) => email);
}
