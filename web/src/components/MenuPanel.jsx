import { useState } from 'react';

const MENU_ITEMS = [
  {
    id: 1,
    name: 'Masala Dosa',
    category: 'South Indian',
    price: 80,
    available: true,
  },
  {
    id: 2,
    name: 'Idli Vada',
    category: 'South Indian',
    price: 70,
    available: true,
  },
  {
    id: 3,
    name: 'Paneer Butter Masala',
    category: 'Main Course',
    price: 180,
    available: true,
  },
  {
    id: 4,
    name: 'Veg Biryani',
    category: 'Rice',
    price: 150,
    available: true,
  },
  {
    id: 5,
    name: 'Chicken Biryani',
    category: 'Rice',
    price: 220,
    available: true,
  },
  {
    id: 6,
    name: 'French Fries',
    category: 'Starters',
    price: 100,
    available: true,
  },
  {
    id: 7,
    name: 'Fresh Lime Soda',
    category: 'Drinks',
    price: 60,
    available: true,
  },
  {
    id: 8,
    name: 'Gulab Jamun',
    category: 'Dessert',
    price: 70,
    available: true,
  },
];

export default function MenuPanel({ onClose }) {
  const [category, setCategory] = useState('All');

  const categories = [
    'All',
    ...new Set(MENU_ITEMS.map((item) => item.category)),
  ];

  const filteredItems =
    category === 'All'
      ? MENU_ITEMS
      : MENU_ITEMS.filter(
          (item) => item.category === category
        );

  return (
    <div className="menu-overlay">
      <div className="menu-panel">

        {/* Header */}
        <div className="menu-header">
          <div>
            <h2>🍽️ Swaad Menu</h2>
            <p>Restaurant food items and prices</p>
          </div>

          <button
            className="menu-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Categories */}
        <div className="menu-categories">
          {categories.map((itemCategory) => (
            <button
              key={itemCategory}
              className={
                category === itemCategory
                  ? 'menu-category active'
                  : 'menu-category'
              }
              onClick={() =>
                setCategory(itemCategory)
              }
            >
              {itemCategory}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="menu-items">

          {filteredItems.map((item) => (
            <div
              className="menu-item"
              key={item.id}
            >

              <div className="menu-item-info">

                <h3>{item.name}</h3>

                <span className="menu-item-category">
                  {item.category}
                </span>

              </div>

              <div className="menu-item-right">

                <strong>
                  ₹{item.price}
                </strong>

                <span
                  className={
                    item.available
                      ? 'menu-available'
                      : 'menu-unavailable'
                  }
                >
                  {item.available
                    ? '● Available'
                    : '● Unavailable'}
                </span>

              </div>

            </div>
          ))}

        </div>

        {/* Footer */}
        <div className="menu-footer">
          <span>
            {filteredItems.length} items
          </span>

          <button
            className="btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}