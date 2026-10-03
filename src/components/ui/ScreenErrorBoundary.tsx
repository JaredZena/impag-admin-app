import { Component, type ReactNode } from 'react';

// If one screen breaks (bad data, a bug), show a plain message with a way
// out instead of a blank white page; the menu keeps working.
export default class ScreenErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Screen crashed:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="max-w-md mx-auto my-16 px-4 text-center">
        <p className="text-lg font-semibold text-gray-900">Algo falló en esta pantalla</p>
        <p className="text-sm text-gray-500 mt-1 mb-5">
          No se perdió nada de lo guardado. Recarga la página; si vuelve a pasar, mándale captura a Jared.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          Recargar
        </button>
      </div>
    );
  }
}
