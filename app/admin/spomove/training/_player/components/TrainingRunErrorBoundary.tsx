'use client';

import { Component, type ReactNode } from 'react';

/** Reports a failed run; does not retry assets or convert an error into completion. */
export class TrainingRunErrorBoundary extends Component<{
  children: ReactNode;
  onError: () => void;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
