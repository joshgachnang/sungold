const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

// Reduces user input like "https://www.YouTube.com/feed" to a bare hostname ("youtube.com").
// Returns undefined when the input is not a valid hostname.
export const normalizeDomain = (input: string): string | undefined => {
  let value = input.trim().toLowerCase();
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  value = value.split(/[/?#]/)[0] ?? "";
  value = value.replace(/:\d+$/, "").replace(/\.$/, "");
  value = value.replace(/^www\./, "");
  return HOSTNAME_PATTERN.test(value) ? value : undefined;
};

// Normalizes and de-duplicates a domain list, preserving first-seen order.
// Returns the invalid inputs separately so callers can report them.
export const normalizeDomains = (inputs: string[]): {domains: string[]; invalid: string[]} => {
  const domains: string[] = [];
  const invalid: string[] = [];
  for (const input of inputs) {
    const domain = normalizeDomain(input);
    if (!domain) {
      invalid.push(input);
    } else if (!domains.includes(domain)) {
      domains.push(domain);
    }
  }
  return {domains, invalid};
};
