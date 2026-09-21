/**
 * Semantic transition between display and editing modes.
 *
 * The reason identifies the state-machine path while the trigger records input
 * modality, so consumers need not reconstruct intent from low-level events.
 */
export interface EditableChange {
  edit: boolean;
  reason: 'activate' | 'light-dismiss' | 'escape' | 'programmatic';
  trigger: 'keyboard' | 'pointer' | 'programmatic';
}
