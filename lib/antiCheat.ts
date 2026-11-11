export function enterFullScreen(): void {
  if (typeof document === "undefined") return;
  const docElm = document.documentElement as any;
  if (docElm.requestFullscreen) {
    docElm.requestFullscreen();
  } else if (docElm.mozRequestFullScreen) {
    docElm.mozRequestFullScreen();
  } else if (docElm.webkitRequestFullScreen) {
    docElm.webkitRequestFullScreen();
  } else if (docElm.msRequestFullscreen) {
    docElm.msRequestFullscreen();
  }
}

export function enableExamAntiCheat(): () => void {
  if (typeof window === "undefined") return () => {};

  const preventRightClick = (e: MouseEvent) => {
    e.preventDefault();
  };

  const preventCopyPaste = (e: ClipboardEvent) => {
    e.preventDefault();
  };

  const preventDevTools = (e: KeyboardEvent) => {
    if (e.key === "F12") {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    if (
      e.ctrlKey &&
      e.shiftKey &&
      (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    if (e.ctrlKey && (e.key === "U" || e.key === "u")) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  document.addEventListener("contextmenu", preventRightClick);
  document.addEventListener("copy", preventCopyPaste);
  document.addEventListener("cut", preventCopyPaste);
  window.addEventListener("keydown", preventDevTools);

  return () => {
    document.removeEventListener("contextmenu", preventRightClick);
    document.removeEventListener("copy", preventCopyPaste);
    document.removeEventListener("cut", preventCopyPaste);
    window.removeEventListener("keydown", preventDevTools);
  };
}