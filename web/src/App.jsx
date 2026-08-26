import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, clearToken } from './api.js';
import Login from './components/Login.jsx';
import Ticket from './components/Ticket.jsx';
import NewOrderForm from './components/NewOrderForm.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';

const COLUMNS = [
  { status: 'PREPARING', label: 'Preparing', className: 'col-preparing' },
  { status: 'READY', label: 'Ready', className: 'col-ready' },
  { status: 'COMPLETED', label: 'Completed', className: 'col-completed' },
];

const POLL_MS = 3000;

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState([]);
  const [conflicts, setConflicts] = useState({});
  const [pending, setPending] = useState({});
  const [toasts, setToasts] = useState([]);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);
  const [connectionLost, setConnectionLost] = useState(false);

  // Profile dropdown
  const [showProfile, setShowProfile] = useState(false);

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  const toastId = useRef(0);

  /* ---- live clock ---- */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* ---- toast notifications ---- */
  const pushToast = useCallback((kind, title, message) => {
    const id = (toastId.current += 1);

    setToasts((current) => [
      ...current,
      {
        id,
        kind,
        title,
        message,
      },
    ]);

    setTimeout(() => {
      setToasts((current) =>
        current.filter((t) => t.id !== id)
      );
    }, 6000);
  }, []);

  /* ---- session ---- */
  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }

    api.me()
      .then((result) => setUser(result.user))
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  /* ---- polling ---- */
  const refresh = useCallback(async () => {
    try {
      const result = await api.listOrders();

      setOrders(result.orders);
      setConnectionLost(false);
    } catch (err) {
      if (err.status === 401) {
        clearToken();
        setUser(null);
        return;
      }

      setConnectionLost(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    refresh();

    const id = setInterval(refresh, POLL_MS);

    return () => clearInterval(id);
  }, [user, refresh]);

  /* ---- advance order ---- */
  async function advance(order, toStatus, expectedVersion) {
    setPending((current) => ({
      ...current,
      [order.id]: true,
    }));

    setConflicts((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });

    try {
      const result = await api.advance(
        order.id,
        toStatus,
        expectedVersion
      );

      setOrders((current) =>
        current.map((o) =>
          o.id === order.id ? result.order : o
        )
      );

      pushToast(
        'success',
        `Order #${order.id}`,
        `Moved to ${toStatus}.`
      );
    } catch (err) {
      const stale = [
        'VERSION_CONFLICT',
        'ORDER_BUSY',
        'DUPLICATE_TRANSITION',
      ].includes(err.code);

      const illegal = [
        'INVALID_TRANSITION',
        'TERMINAL_STATE',
      ].includes(err.code);

      if (stale || illegal) {
        setConflicts((current) => ({
          ...current,
          [order.id]: {
            code: err.code,
            message: err.message,
          },
        }));

        await refresh();
      } else {
        pushToast(
          'error',
          err.code || 'Error',
          err.message
        );
      }
    } finally {
      setPending((current) => {
        const next = { ...current };

        delete next[order.id];

        return next;
      });
    }
  }

  /* ---- create order ---- */
  async function createOrder(payload) {
    const key = crypto.randomUUID();

    const result = await api.createOrder(
      payload,
      key
    );

    await refresh();

    pushToast(
      'success',
      `Order #${result.order.id}`,
      'Sent to the kitchen.'
    );
  }

  /* ---- sign out ---- */
  function signOut() {
    clearToken();
    setUser(null);
    setOrders([]);
    setShowProfile(false);
  }

  /* ---- loading ---- */
  if (checking) return null;

  /* ---- login ---- */
  if (!user) {
    return <Login onSignedIn={setUser} />;
  }

  /* ---- counts ---- */
  const counts = COLUMNS.map(
    (column) =>
      orders.filter(
        (o) => o.status === column.status
      ).length
  );

  // Preparing orders shown on notification bell
  const notificationCount = counts[0];

  return (
    <>
      {/* ================= TOP BAR ================= */}

      <header className="topbar">

        {/* Brand */}
        <div className="brand">
          Swaad <span>· Kitchen Operations</span>
        </div>

        {/* Restaurant status */}
        <div className="restaurant-status">
          <span className="status-dot"></span>
          Open
        </div>

        {/* Live time */}
        <div className="current-time">
          {currentTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        <div className="topbar-spacer" />

        {/* Order counts */}
        <div className="counts">
          {COLUMNS.map((column, index) => (
            <div key={column.status}>
              <strong>{counts[index]}</strong>
              {column.label}
            </div>
          ))}
        </div>

        {/* Notification */}
        <button
          className="notification-btn"
          title={`${notificationCount} orders preparing`}
        >
          🔔

          {notificationCount > 0 && (
            <span className="notification-badge">
              {notificationCount}
            </span>
          )}
        </button>

        {/* New order */}
        <button
          className="btn btn-primary"
          onClick={() => setShowNewOrder(true)}
        >
          New order
        </button>

        {/* Profile */}
        <div className="profile-wrapper">

          <button
            className="profile-btn"
            onClick={() =>
              setShowProfile(
                (current) => !current
              )
            }
          >
            👤 {user.name} · {user.role} ▾
          </button>

          {showProfile && (
            <div className="profile-menu">

              <strong>{user.name}</strong>

              <span>{user.role}</span>

              <div className="profile-divider" />

              <button
                onClick={() =>
                  setShowProfile(false)
                }
              >
                Profile
              </button>

              <button onClick={signOut}>
                Sign out
              </button>

            </div>
          )}

        </div>

      </header>

      {/* ================= CONNECTION WARNING ================= */}

      {connectionLost && (
        <div
          className="form-error"
          style={{
            margin: '1rem 1.5rem 0',
          }}
        >
          Lost contact with the server. Showing the
          last known board and retrying every{' '}
          {POLL_MS / 1000}s.
        </div>
      )}

      {/* ================= ORDER BOARD ================= */}

      <main className="board">

        {COLUMNS.map((column) => {

          const columnOrders = orders.filter(
            (order) =>
              order.status === column.status
          );

          return (
            <section
              key={column.status}
              className={column.className}
            >

              {/* Column heading */}

              <div className="column-head">

                <h2>{column.label}</h2>

                <span className="tally">
                  {columnOrders.length}
                </span>

              </div>

              {/* Empty column */}

              {columnOrders.length === 0 ? (

                <p className="empty">

                  {column.status === 'PREPARING'
                    ? 'Nothing in the kitchen. Start an order.'
                    : `No orders ${column.label.toLowerCase()}.`}

                </p>

              ) : (

                /* Orders */

                columnOrders.map((order) => (

                  <Ticket
                    key={order.id}
                    order={order}
                    conflict={conflicts[order.id]}
                    busy={Boolean(
                      pending[order.id]
                    )}
                    onAdvance={advance}
                    onHistory={setHistoryFor}
                  />

                ))

              )}

            </section>
          );

        })}

      </main>

      {/* ================= NEW ORDER ================= */}

      {showNewOrder && (
        <NewOrderForm
          onClose={() =>
            setShowNewOrder(false)
          }
          onCreate={createOrder}
        />
      )}

      {/* ================= HISTORY ================= */}

      {historyFor && (
        <HistoryPanel
          order={historyFor}
          onClose={() =>
            setHistoryFor(null)
          }
        />
      )}

      {/* ================= TOASTS ================= */}

      <div
        className="toasts"
        role="status"
        aria-live="polite"
      >

        {toasts.map((toast) => (

          <div
            key={toast.id}
            className={`toast ${toast.kind}`}
          >

            <strong>
              {toast.title}
            </strong>

            {toast.message}

          </div>

        ))}

      </div>

    </>
  );
}