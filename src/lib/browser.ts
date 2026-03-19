/** Thin wrapper around browser APIs for testability */
export function reloadPage() {
  window.location.reload();
}

export function navigateTo(url: string) {
  window.location.assign(url);
}
