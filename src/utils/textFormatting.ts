/**
 * Text Formatting Utilities
 * Proper case (title case) conversion for user inputs
 */

/**
 * Check if a string contains only lowercase letters
 * - Ignores digits, spaces, punctuation, emoji (not letters)
 * - Returns false if there are no letters at all (nothing to reformat)
 * - Returns true if there is at least one letter AND all letters are lowercase
 * - Returns false if ANY letter is uppercase
 * 
 * Examples:
 * "hello world" → true
 * "Hello world" → false
 * "HELLO" → false
 * "usa" → true
 * "USA" → false
 * "123 456" → false (no letters)
 * "" → false
 * "spider-man" → true
 * "Spider-Man" → false
 * "hello USA" → false (mixed)
 */
export const isAllLowercase = (text: string): boolean => {
  if (!text) return false;
  
  // Extract only letters (ignore digits, spaces, punctuation, etc)
  const letters = text.replace(/[^a-zA-Z]/g, '');
  
  // If no letters at all, return false (nothing to reformat)
  if (letters.length === 0) return false;
  
  // Check if all letters are lowercase
  return letters === letters.toLowerCase();
};

/**
 * Convert text to proper case (title case)
 * - First letter of each word capitalized
 * - Rest of letters lowercase
 * - Preserves spacing and punctuation
 * 
 * Examples:
 * "hello world" → "Hello World"
 * "HELLO WORLD" → "Hello World"
 * "hello-world" → "Hello-World"
 */
export const toProperCase = (text: string): string => {
  if (!text) return text;
  
  return text
    .split(' ')
    .map(word => {
      if (!word) return word;
      
      // Handle hyphenated words
      return word
        .split('-')
        .map(part => {
          if (!part) return part;
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('-');
    })
    .join(' ');
};

/**
 * Convert text to proper case preserving acronyms
 * More intelligent version that tries to preserve common patterns
 * 
 * Note: This is more complex and might not be needed for most cases.
 * Use toProperCase() for simpler, more consistent behavior.
 */
export const toProperCasePreserveAcronyms = (text: string): string => {
  if (!text) return text;
  
  const acronyms = ['USA', 'UK', 'NYC', 'LA', 'DC', 'ID', 'VIP', 'CEO', 'CFO', 'CTO'];
  
  return text
    .split(' ')
    .map(word => {
      if (!word) return word;
      
      // Check if it's a known acronym
      if (acronyms.includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      
      // Otherwise apply title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};
