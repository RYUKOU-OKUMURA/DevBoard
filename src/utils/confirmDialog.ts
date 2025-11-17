interface ConfirmOptions {
  title: string;
  description?: string;
  confirmWarning?: string;
}

export function confirmDestructiveAction({
  title,
  description = 'この操作は取り消せません。本当に実行しますか？',
  confirmWarning,
}: ConfirmOptions): boolean {
  if (!window.confirm(title)) {
    return false;
  }

  if (confirmWarning) {
    return window.confirm(confirmWarning);
  }

  return window.confirm(description);
}
