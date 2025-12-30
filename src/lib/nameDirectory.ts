const NAME_OVERRIDES: Record<string, string> = {
  'hr@virtualfreelancesolutions.com': 'Patrick',
  'mjesguerraiman@gmail.com': 'Meryl Jean Iman',
  'salmeromalcomeduc@gmail.com': 'Malcom Joseph Vincent Salmero',
  'joanargao@gmail.com': 'Kristin Joann Argao',
  'dzaydee06@gmail.com': 'Juno Dianne Garciano',
  'jaeransanchez@gmail.com': 'Jaeran Sanchez',
};

export function getKnownNameByEmail(email: string): string | null {
  const key = email.toLowerCase().trim();
  return NAME_OVERRIDES[key] ?? null;
}
