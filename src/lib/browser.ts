/** Thin wrapper around browser APIs for testability */
export function navigateTo(url: string) {
  window.location.assign(url);
}
