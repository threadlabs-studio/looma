/** Event contracts for the declarative mention menu. */

/** Zero-based candidate position requested by pointer-driven menu highlighting. */
export interface MentionMenuHighlightEventDetail {
  index: number;
}

/** Zero-based candidate position the host should commit as the chosen mention. */
export interface MentionMenuSelectEventDetail {
  index: number;
}
