"use client";

import { useState } from "react";

export function useTagManager(
  initialTags: string[],
  existingTagPool: string[],
) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");

  const filteredTagSuggestions = tagInput
    ? existingTagPool.filter((t) =>
        t.toLowerCase().includes(tagInput.toLowerCase()),
      )
    : existingTagPool;

  function addTag(tag: string) {
    if (!tag.trim() || tags.includes(tag.trim())) return;
    setTags((prev) => [...prev, tag.trim()]);
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function toggleExistingTag(tag: string) {
    if (tags.includes(tag)) removeTag(tag);
    else addTag(tag);
  }

  return {
    tags,
    tagInput,
    setTagInput,
    filteredTagSuggestions,
    addTag,
    removeTag,
    toggleExistingTag,
  };
}
