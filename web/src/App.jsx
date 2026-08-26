import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, clearToken } from './api.js';
import Login from './components/Login.jsx';
import Ticket from './components/Ticket.jsx';
import NewOrderForm from './components/NewOrderForm.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import MenuPanel from './components/MenuPanel.jsx';

const COLUMNS = [
  {
    status: 'PREPARING',
    label: 'Preparing',
    className: 'col-preparing',
  },
  {
    status: 'READY',
    label: 'Ready',
    className: 'col-ready',
  },
  {
    status: 'COMPLETED',
    label: 'Completed',
    className: 'col-completed',
  },
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

  /* ---------------- PROFILE ---------------- */

  const [showProfile, setShowProfile] = useState(false);

  /* ---------------- MENU ---------------- */

  const [showMenu, setShowMenu] = useState(false);

  /* ---------------- LIVE CLOCK ---------------- */

  const [currentTime, setCurrentTime] = useState(new Date());

  /* ---------------- SEARCH ---------------- */

  const [searchTerm, setSearchTerm] = useState('');

  /* ---------------- RESTAURANT STATUS ---------------- */

  const [restaurantStatus, setRestaurantStatus] = useState('OPEN');

  const toastId = useRef(0);

  /* =====================================================
     LIVE CLOCK
  ===================================================== */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* =====================================================
     TOAST NOTIFICATIONS
  ===================================================== */

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
        current.filter((toast) => toast.id !== id)
      );
    }, 6000);
  }, []);

  /* =====================================================
     SESSION
  ===================================================== */

  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }

    api.me()
      .then((result) => {
        setUser(result.user);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  /* =====================================================
     LOAD ORDERS
  ===================================================== */

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

  /* =====================================================
     POLLING
  ===================================================== */

  useEffect(() => {
    if (!user) return undefined;

    refresh();

    const id = setInterval(refresh, POLL_MS);

    return () => clearInterval(id);
  }, [user, refresh]);

  /* =====================================================
     ADVANCE ORDER
  ===================================================== */

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
          o.id === order.id
            ? result.order
            : o
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

  /* =====================================================
     CREATE ORDER

     Orders CAN still be created when restaurant is CLOSED.
  ===================================================== */

  async function createOrder(payload) {
    try {
      const key = crypto.randomUUID();

      const result = await api.createOrder(
        payload,
        key
      );

      await refresh();

      pushToast(
        'success',
        `Order #${result.order.id}`,
        restaurantStatus === 'OPEN'
          ? 'Sent to the kitchen.'
          : 'Order booked while restaurant is closed.'
      );

      setShowNewOrder(false);
    } catch (err) {
      pushToast(
        'error',
        err.code || 'Order Error',
        err.message || 'Could not create order.'
      );
    }
  }

  /* =====================================================
     RESTAURANT STATUS
  ===================================================== */

  function changeRestaurantStatus(status) {
    setRestaurantStatus(status);

    if (status === 'OPEN') {
      pushToast(
        'success',
        'Restaurant status',
        'Restaurant is now open.'
      );
    } else {
      pushToast(
        'success',
        'Restaurant status',
        'Restaurant is now closed. Orders can still be booked.'
      );
    }
  }

  /* =====================================================
     SIGN OUT
  ===================================================== */

  function signOut() {
    clearToken();

    setUser(null);
    setOrders([]);

    setShowProfile(false);
    setShowMenu(false);
    setShowNewOrder(false);
    setHistoryFor(null);
    setSearchTerm('');
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (checking) {
    return null;
  }

  /* =====================================================
     LOGIN
  ===================================================== */

  if (!user) {
    return <Login onSignedIn={setUser} />;
  }

  /* =====================================================
     ORDER COUNTS
  ===================================================== */

  const counts = COLUMNS.map((column) =>
    orders.filter(
      (order) => order.status === column.status
    ).length
  );

  const notificationCount = counts[0];

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredOrders = orders.filter((order) => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    if (!search) {
      return true;
    }

    return (
      String(order.id)
        .toLowerCase()
        .includes(search) ||

      String(order.customerName || '')
        .toLowerCase()
        .includes(search) ||

      String(order.tableNumber || '')
        .toLowerCase()
        .includes(search)
    );
  });

  /* =====================================================
     UI
  ===================================================== */

  return (
    <>
      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="topbar">

        {/* BRAND */}

        <div className="brand">
          Swaad
          <span>· Kitchen Operations</span>
        </div>

        {/* =================================================
            RESTAURANT OPEN / CLOSED SELECTOR
        ================================================= */}

        <div className="restaurant-status-wrapper">

          <span
            className={`status-dot ${
              restaurantStatus === 'OPEN'
                ? 'status-open'
                : 'status-closed'
            }`}
          />

          <select
            className={`restaurant-status-select ${
              restaurantStatus === 'OPEN'
                ? 'open'
                : 'closed'
            }`}
            value={restaurantStatus}
            onChange={(e) =>
              changeRestaurantStatus(
                e.target.value
              )
            }
          >
            <option value="OPEN">
              🟢 Open
            </option>

            <option value="CLOSED">
              🔴 Closed
            </option>
          </select>

        </div>

        {/* LIVE TIME */}

        <div className="current-time">
          {currentTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        <div className="topbar-spacer" />

        {/* SEARCH */}

        <div className="order-search">

          <span>🔍</span>

          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />

          {searchTerm && (
            <button
              className="search-clear"
              onClick={() =>
                setSearchTerm('')
              }
              title="Clear search"
            >
              ×
            </button>
          )}

        </div>

        {/* ORDER COUNTS */}

        <div className="counts">

          {COLUMNS.map(
            (column, index) => (
              <div
                key={column.status}
              >
                <strong>
                  {counts[index]}
                </strong>

                {column.label}
              </div>
            )
          )}

        </div>

        {/* NOTIFICATIONS */}

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

        {/* =================================================
            MENU
        ================================================= */}

        <button
          className="btn"
          onClick={() =>
            setShowMenu(true)
          }
        >
          🍽️ Menu
        </button>

        {/* =================================================
            NEW ORDER
            AVAILABLE EVEN WHEN CLOSED
        ================================================= */}

        <button
          className="btn btn-primary"
          onClick={() =>
            setShowNewOrder(true)
          }
        >
          + New order
        </button>

        {/* PROFILE */}

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

              <strong>
                {user.name}
              </strong>

              <span>
                {user.role}
              </span>

              <div className="profile-divider" />

              <button
                onClick={() =>
                  setShowProfile(false)
                }
              >
                Profile
              </button>

              <button
                onClick={signOut}
              >
                Sign out
              </button>

            </div>
          )}

        </div>

      </header>

      {/* =================================================
          CLOSED INFORMATION
      ================================================= */}

      {restaurantStatus === 'CLOSED' && (
        <div className="restaurant-closed-banner">

          <span>🔴</span>

          <div>
            <strong>
              Restaurant is currently closed
            </strong>

            <span>
              New orders can still be booked
              and will be available for kitchen
              processing.
            </span>
          </div>

        </div>
      )}

      {/* =================================================
          CONNECTION WARNING
      ================================================= */}

      {connectionLost && (
        <div
          className="form-error"
          style={{
            margin: '1rem 1.5rem 0',
          }}
        >
          Lost contact with the server.
          Showing the last known board and
          retrying every{' '}
          {POLL_MS / 1000}s.
        </div>
      )}

      {/* =================================================
          SEARCH RESULT
      ================================================= */}

      {searchTerm && (
        <div className="search-result-info">

          {filteredOrders.length === 0
            ? `No orders found for "${searchTerm}"`
            : `${filteredOrders.length} order${
                filteredOrders.length === 1
                  ? ''
                  : 's'
              } found`}

        </div>
      )}

      {/* =================================================
          ORDER BOARD
      ================================================= */}

      <main className="board">

        {COLUMNS.map((column) => {

          const columnOrders =
            filteredOrders.filter(
              (order) =>
                order.status ===
                column.status
            );

          return (
            <section
              key={column.status}
              className={
                column.className
              }
            >

              {/* COLUMN HEADER */}

              <div className="column-head">

                <h2>
                  {column.label}
                </h2>

                <span className="tally">
                  {columnOrders.length}
                </span>

              </div>

              {/* EMPTY COLUMN */}

              {columnOrders.length === 0 ? (

                <p className="empty">

                  {searchTerm
                    ? 'No matching orders.'

                    : column.status ===
                      'PREPARING'

                    ? 'Nothing in the kitchen. Start an order.'

                    : `No orders ${column.label.toLowerCase()}.`}

                </p>

              ) : (

                columnOrders.map(
                  (order) => (

                    <Ticket
                      key={order.id}
                      order={order}
                      conflict={
                        conflicts[order.id]
                      }
                      busy={Boolean(
                        pending[order.id]
                      )}
                      onAdvance={advance}
                      onHistory={
                        setHistoryFor
                      }
                    />

                  )
                )

              )}

            </section>
          );

        })}

      </main>

      {/* =================================================
          MENU PANEL
      ================================================= */}

      {showMenu && (
        <MenuPanel
          onClose={() =>
            setShowMenu(false)
          }
        />
      )}

      {/* =================================================
          NEW ORDER MODAL
      ================================================= */}

      {showNewOrder && (
        <NewOrderForm
          onClose={() =>
            setShowNewOrder(false)
          }
          onCreate={createOrder}
        />
      )}

      {/* =================================================
          HISTORY
      ================================================= */}

      {historyFor && (
        <HistoryPanel
          order={historyFor}
          onClose={() =>
            setHistoryFor(null)
          }
        />
      )}

      {/* =================================================
          TOASTS
      ================================================= */}

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