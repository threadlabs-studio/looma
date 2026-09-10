export interface EditableChange {
  edit: boolean;
  reason: 'activate' | 'light-dismiss' | 'escape' | 'programmatic';
  trigger: 'keyboard' | 'pointer' | 'programmatic';
}
