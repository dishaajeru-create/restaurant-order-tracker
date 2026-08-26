import { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Login({ onSignedIn }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: 'priya@restaurant.test',
    password: 'password123'
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result =
        mode === 'login'
          ? await api.login(form.email, form.password)
          : await api.register({
              name: form.name,
              email: form.email,
              password: form.password
            });

      setToken(result.token);
      onSignedIn(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">

      <section className="login-showcase">
        <div className="showcase-content">

          <div className="logo-mark">🍽️</div>

          <p className="eyebrow">RESTAURANT OPERATIONS</p>

          <h1>
            Keep your
            <span> kitchen moving.</span>
          </h1>

          <p className="showcase-text">
            Manage orders, track kitchen progress and keep your entire
            restaurant team synchronized in real time.
          </p>

          <div className="feature-list">
            <div className="feature">
              <span>01</span>
              <div>
                <strong>Live order tracking</strong>
                <small>See every order as it moves through the kitchen.</small>
              </div>
            </div>

            <div className="feature">
              <span>02</span>
              <div>
                <strong>Team coordination</strong>
                <small>Keep staff working from the same live board.</small>
              </div>
            </div>

            <div className="feature">
              <span>03</span>
              <div>
                <strong>Reliable workflow</strong>
                <small>Prevent conflicting order updates automatically.</small>
              </div>
            </div>
          </div>

          <div className="showcase-footer">
            <span>● SYSTEM ONLINE</span>
            <span>ORDER TRACKER</span>
          </div>

        </div>
      </section>

      <section className="login-side">
        <div className="login-card">

          <div className="mobile-logo">🍽️ Brand</div>

          <div className="login-heading">
            <p className="login-kicker">
              {mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}
            </p>

            <h2>
              {mode === 'login'
                ? 'Sign in to your kitchen'
                : 'Create your account'}
            </h2>

            <p>
              {mode === 'login'
                ? 'Enter your details to continue.'
                : 'Set up your restaurant staff account.'}
            </p>
          </div>

          <form onSubmit={submit}>

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            {mode === 'register' && (
              <div className="field">
                <label htmlFor="name">Your name</label>
                <input
                  id="name"
                  value={form.name}
                  onChange={update('name')}
                  placeholder="Enter your name"
                  required
                  minLength={2}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@restaurant.com"
                required
              />
            </div>

            <div className="field">
              <div className="password-label">
                <label htmlFor="password">Password</label>
              </div>

              <input
                id="password"
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="Enter your password"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={busy}
            >
              {busy
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in →'
                  : 'Create account →'}
            </button>

          </form>

          <div className="login-switch">
            <span>
              {mode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </span>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
            >
              {mode === 'login'
                ? 'Create account'
                : 'Sign in'}
            </button>
          </div>

          <div className="demo-account">
            <span className="demo-dot"></span>

            <div>
              <strong>Demo access</strong>
              <p>
                priya@restaurant.test
                <br />
                password123
              </p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}