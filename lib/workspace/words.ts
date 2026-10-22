/** Real words in a transcript or typed note: speaker labels, emoji and punctuation don't count. Shared by the recorder and the API so they agree. */
export function realWordCount(input: string): number {
  return (input.replace(/^\s*[^:\n]{1,40}:\s/gm, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
}
