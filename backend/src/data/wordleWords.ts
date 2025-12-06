const API_URL = "https://api.dictionaryapi.dev/api/v1/entries/en";

export function generateRandomWord(wordList: string[]): string {
  const filteredWords = wordList.filter((word) => word.length === 5);
  return filteredWords[Math.floor(Math.random() * filteredWords.length)];
}

export function validateSubmission(word: string): boolean {
  return /^[a-z]{5}$/i.test(word.trim());
}

export async function isValidEnglishWord(word: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/${word.toLowerCase()}`);
    return response.status === 200;
  } catch (error) {
    console.error("Error checking word validity:", error);
    return false;
  }
}

export async function validateWordSubmission(word: string): Promise<{
  isValid: boolean;
  reason?: string;
}> {
  if (!validateSubmission(word)) {
    return { isValid: false, reason: "Word must be exactly 5 letters" };
  }

  const isEnglishWord = await isValidEnglishWord(word);
  if (!isEnglishWord) {
    return { isValid: false, reason: "Word is not in the dictionary" };
  }

  return { isValid: true };
}