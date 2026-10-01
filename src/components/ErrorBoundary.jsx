import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="center-box" style={{ minHeight: '100vh' }}>
        <h2>Something went wrong</h2>
        <p className="muted">Please reload the page. If it keeps happening, try again in a minute.</p>
        <button className="btn primary" onClick={() => window.location.assign('/')}>Back to home</button>
      </div>
    );
  }
}
