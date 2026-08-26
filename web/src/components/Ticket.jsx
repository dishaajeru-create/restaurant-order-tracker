import { useEffect, useState } from 'react';

const LABEL = {
  READY: 'Mark ready',
  COMPLETED: 'Mark completed',
};

const PRIORITIES = {
  NORMAL: {
    label: 'Normal',
    icon: '⚪',
  },
  HIGH: {
    label: 'High',
    icon: '🟠',
  },
  URGENT: {
    label: 'Urgent',
    icon: '🔴',
  },
};

function elapsed(since) {
  const minutes = Math.floor(
    (Date.now() - new Date(since).getTime()) / 60000
  );

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/* Get saved priority for this order */
function getSavedPriority(orderId) {
  try {
    const saved = localStorage.getItem(
      `swaad-order-priority-${orderId}`
    );

    return saved || 'NORMAL';
  } catch {
    return 'NORMAL';
  }
}

export default function Ticket({
  order,
  conflict,
  busy,
  onAdvance,
  onHistory,
}) {
  const [, setTick] = useState(0);

  const [priority, setPriority] = useState(() =>
    getSavedPriority(order.id)
  );

  /* Re-render every 30 seconds for order age */
  useEffect(() => {
    const id = setInterval(() => {
      setTick((n) => n + 1);
    }, 30000);

    return () => clearInterval(id);
  }, []);

  /* Save priority */
  function changePriority(newPriority) {
    setPriority(newPriority);

    try {
      localStorage.setItem(
        `swaad-order-priority-${order.id}`,
        newPriority
      );
    } catch {
      // Ignore localStorage errors
    }
  }

  const age = elapsed(order.createdAt);

  const isLate =
    order.status !== 'COMPLETED' &&
    Date.now() -
      new Date(order.createdAt).getTime() >
      15 * 60000;

  return (
    <article
      className={`ticket s-${order.status}${
        conflict ? ' conflicted' : ''
      } priority-${priority.toLowerCase()}`}
    >
      {/* ================= TICKET HEADER ================= */}

      <div className="ticket-head">
        <span className="ticket-no">
          #{order.id}
        </span>

        <span
          className={`ticket-timer${
            isLate ? ' late' : ''
          }`}
        >
          {isLate ? '⚠️ ' : '🕒 '}
          {age}
        </span>
      </div>

      {/* ================= PRIORITY ================= */}

      <div className="priority-row">
        <span className="priority-label">
          Priority
        </span>

        <select
          className={`priority-select priority-${priority.toLowerCase()}`}
          value={priority}
          onChange={(e) =>
            changePriority(e.target.value)
          }
        >
          {Object.entries(PRIORITIES).map(
            ([value, data]) => (
              <option
                key={value}
                value={value}
              >
                {data.icon} {data.label}
              </option>
            )
          )}
        </select>

        {priority === 'URGENT' && (
          <span className="urgent-badge">
            🔴 URGENT
          </span>
        )}
      </div>

      {/* ================= ORDER META ================= */}

      <div className="ticket-meta">
        {order.tableNumber
          ? `Table ${order.tableNumber}`
          : 'No table'}

        {order.customerName
          ? ` · ${order.customerName}`
          : ''}

        {' · ₹'}

        {Number(order.totalAmount).toFixed(2)}
      </div>

      {/* ================= ITEMS ================= */}

      <ul className="items">
        {order.items.map((item) => (
          <li key={item.id}>
            <span>
              <span className="qty">
                {item.quantity}×
              </span>

              {item.name}
            </span>

            <span className="qty">
              ₹{Number(item.unitPrice).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      {/* ================= CONFLICT ================= */}

      {conflict && (
        <div className="conflict">
          {conflict.message}

          <br />

          <code>
            {conflict.code}
          </code>
        </div>
      )}

      {/* ================= FOOTER ================= */}

      <div className="ticket-foot">
        <span className="version">
          v{order.version}
        </span>

        <button
          className="link-btn"
          onClick={() => onHistory(order)}
        >
          History
        </button>

        {order.nextStatus && (
          <button
            className={`advance to-${order.nextStatus}`}
            disabled={busy}
            onClick={() =>
              onAdvance(
                order,
                order.nextStatus,
                order.version
              )
            }
          >
            {busy
              ? 'Sending…'
              : LABEL[order.nextStatus]}
          </button>
        )}
      </div>
    </article>
  );
}