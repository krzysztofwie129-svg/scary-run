// InstallPromptManager — detekcja iPhone Safari + decyzja czy pokazać prompt
// "Add to Home Screen" (sesja P3.1). LocalStorage key osobny od save/leaderboard.
//
// Quirk: iOS Safari nie wspiera Fullscreen API dla zwykłych stron — jedyna
// droga do fullscreen-like na iPhone to PWA przez "Add to Home Screen". Prompt
// pokazujemy raz, zamknięty zostaje zapisany.

const STORAGE_KEY = 'scary_run_install_prompt_dismissed_v1';

export const InstallPromptManager = {
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  },

  isSafari() {
    const ua = navigator.userAgent.toLowerCase();
    // iOS Safari ma "safari" w UA, ale nie "crios"/"fxios"/"edgios" (Chrome /
    // Firefox / Edge na iOS — wszystkie używają WebKit ale chcemy odróżnić).
    return ua.includes('safari')
      && !ua.includes('crios')
      && !ua.includes('fxios')
      && !ua.includes('edgios');
  },

  isStandalone() {
    // Już zainstalowane jako PWA?
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  },

  isDismissed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  },

  markDismissed() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) { /* ignore */ }
  },

  /** Czy powinniśmy pokazać prompt? */
  shouldShow() {
    return this.isIOS()
      && this.isSafari()
      && !this.isStandalone()
      && !this.isDismissed();
  },
};
