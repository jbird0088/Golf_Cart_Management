import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

const AdminPage = () => {
  const [carts, setCarts] = useState([]);
  const [newCartNumber, setNewCartNumber] = useState('');
  const [newCartStatus, setNewCartStatus] = useState('available');
  const { authState } = useContext(AuthContext);

  useEffect(() => {
    const fetchCarts = async () => {
      if (!authState.loading && authState.isAuthenticated) {
        console.log('Fetching carts...');
        try {
          const res = await axios.get('http://localhost:5000/api/carts', {
            headers: {
              'x-auth-token': authState.token,
            },
          });
          console.log('Fetched Carts:', res.data);
          setCarts(res.data);
        } catch (err) {
          console.error('Error fetching carts:', err);
        }
      }
    };
    fetchCarts();
  }, [authState.loading, authState.isAuthenticated, authState.token]);

  const handleAddCart = async () => {
    if (!newCartNumber) {
      console.error('Cart number is required'); // Log error if cart number is empty
      return;
    }
    console.log('Adding cart...');
    try {
      const res = await axios.post(
        'http://localhost:5000/api/carts',
        { Cart_Number: newCartNumber, Cart_Status: newCartStatus },
        {
          headers: {
            'x-auth-token': authState.token,
          },
        }
      );
      console.log('Added Cart:', res.data);
      setCarts([...carts, res.data]);
      setNewCartNumber('');
      setNewCartStatus('available');
    } catch (err) {
      console.error('Error adding cart:', err);
    }
  };

  if (authState.loading) {
    return <p>Loading...</p>;
  }

  if (!authState.isAuthenticated) {
    return <p>You are not authenticated</p>;
  }

  return (
    <div>
      <h1>Admin Page</h1>
      <p>The AdminPage component is rendered.</p>
      <p>Welcome, Admin!</p>
      <div>
        <h2>Add New Cart</h2>
        <input
          type="number"
          value={newCartNumber}
          onChange={(e) => setNewCartNumber(e.target.value)}
          placeholder="New Cart Number"
          required
        />
        <select value={newCartStatus} onChange={(e) => setNewCartStatus(e.target.value)}>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <button onClick={handleAddCart}>Add Cart</button>
      </div>
      <h2>Existing Carts</h2>
      <ul>
        {carts.length > 0 ? (
          carts.map((cart) => (
            <li key={cart.Cart_Number}>
              Cart {cart.Cart_Number}: {cart.Cart_Status}
            </li>
          ))
        ) : (
          <p>No carts available</p>
        )}
      </ul>
    </div>
  );
};

export default AdminPage;
