import { create } from 'zustand';

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';
type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
  position: ToastPosition;
  dismissible: boolean;
  action?: ToastAction;
  createdAt: number;
}

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  position?: ToastPosition;
  dismissible?: boolean;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  position: ToastPosition;
}

interface ToastActions {
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  setPosition: (position: ToastPosition) => void;
  success: (title: string, description?: string, options?: Partial<ToastOptions>) => string;
  error: (title: string, description?: string, options?: Partial<ToastOptions>) => string;
  warning: (title: string, description?: string, options?: Partial<ToastOptions>) => string;
  info: (title: string, description?: string, options?: Partial<ToastOptions>) => string;
  promise: <T>(
    promiseFn: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => Promise<T>;
}

type ToastStore = ToastState & ToastActions;

const generateId = (): string =>
  `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const DEFAULT_DURATION = 5000;
const DEFAULT_POSITION: ToastPosition = 'bottom-right';

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],
  position: DEFAULT_POSITION,

  addToast: (options) => {
    const id = generateId();
    const toast: Toast = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant ?? 'default',
      duration: options.duration ?? DEFAULT_DURATION,
      position: options.position ?? get().position,
      dismissible: options.dismissible ?? true,
      action: options.action,
      createdAt: Date.now(),
    };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    if (toast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration);
    }

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearAllToasts: () =>
    set({ toasts: [] }),

  setPosition: (position) =>
    set({ position }),

  success: (title, description, options) =>
    get().addToast({ title, description, variant: 'success', ...options }),

  error: (title, description, options) =>
    get().addToast({ title, description, variant: 'error', duration: 8000, ...options }),

  warning: (title, description, options) =>
    get().addToast({ title, description, variant: 'warning', ...options }),

  info: (title, description, options) =>
    get().addToast({ title, description, variant: 'info', ...options }),

  promise: async <T>(
    promiseFn: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ): Promise<T> => {
    const loadingId = get().addToast({
      title: messages.loading,
      variant: 'default',
      duration: 0,
      dismissible: false,
    });

    try {
      const result = await promiseFn;
      get().removeToast(loadingId);
      get().success(messages.success);
      return result;
    } catch (err) {
      get().removeToast(loadingId);
      const errorMessage =
        err instanceof Error ? err.message : messages.error;
      get().error(messages.error, errorMessage);
      throw err;
    }
  },
}));

export type { Toast, ToastVariant, ToastPosition, ToastOptions, ToastAction, ToastStore };
