type PageLoadingListener = () => void;

let activeRequestCount = 0;
const listeners = new Set<PageLoadingListener>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export const beginPageLoading = () => {
  activeRequestCount += 1;
  notifyListeners();
};

export const endPageLoading = () => {
  activeRequestCount = Math.max(activeRequestCount - 1, 0);
  notifyListeners();
};

export const isPageLoading = () => activeRequestCount > 0;

export const subscribePageLoading = (listener: PageLoadingListener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
