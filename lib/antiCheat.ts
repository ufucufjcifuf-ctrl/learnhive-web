// ব্রাউজারে ফুলস্ক্রিন চালু করার ফাংশন
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

// ব্রাউজারের রাইট-ক্লিক ও কপি-কাট ব্লক করার ইভেন্ট লিসেনার
export function enableExamAntiCheat(): () => void {
  if (typeof window === "undefined") return () => {};

  const preventRightClick = (e: MouseEvent) => {
    e.preventDefault();
  };

  const preventCopyPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    alert("⚠️ পরীক্ষার সময় প্রশ্ন কপি বা পেস্ট করা সম্পূর্ণ নিষিদ্ধ!");
  };

  document.addEventListener("contextmenu", preventRightClick);
  document.addEventListener("copy", preventCopyPaste);
  document.addEventListener("cut", preventCopyPaste);

  return () => {
    document.removeEventListener("contextmenu", preventRightClick);
    document.removeEventListener("copy", preventCopyPaste);
    document.removeEventListener("cut", preventCopyPaste);
  };
}