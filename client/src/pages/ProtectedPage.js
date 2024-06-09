import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import 'bootswatch/dist/lux/bootstrap.min.css'; // Ensure the correct path
import '../styles.css';
import deerCreekLogo from '../Logo/deercreek-logo.png'; // Import the logo

const ProtectedPage = () => {
  const [carts, setCarts] = useState([]);
  const [selectedCart, setSelectedCart] = useState(null);
  const [reason, setReason] = useState('');
  const [maintenanceContacted, setMaintenanceContacted] = useState(false);
  const { authState } = useContext(AuthContext);

  useEffect(() => {
    const fetchCarts = async () => {
      if (!authState.loading && authState.isAuthenticated) {
        try {
          const response = await axios.get('http://localhost:5000/api/carts', {
            headers: {
              'x-auth-token': authState.token,
            },
          });
          setCarts(response.data);
        } catch (err) {
          console.error('Error fetching carts:', err);
        }
      }
    };
    fetchCarts();
  }, [authState.loading, authState.isAuthenticated, authState.token]);

  const updateCartStatus = async (cartId, status) => {
    const cart = carts.find(c => c._id === cartId);
    if (!cart) return;

    try {
      const response = await axios.put(
        `http://localhost:5000/api/carts/${cartId}`,
        { Cart_Status: status, reason, maintenanceContacted },
        {
          headers: {
            'x-auth-token': authState.token,
          },
        }
      );

      const updatedCarts = carts.map(c =>
        c._id === cartId ? { ...c, Cart_Status: status, Order: status === 'available' ? 1 : 999 } : c
      );

      updatedCarts.sort((a, b) => a.Order - b.Order);

      setCarts(updatedCarts);
      console.log(response);
    } catch (err) {
      console.error('Error updating cart status:', err);
    }
  };

  const handleStatusChange = (cartId, status) => {
    if (status === 'out_of_order') {
      setSelectedCart(cartId);
    } else {
      updateCartStatus(cartId, status);
    }
  };

  const handleOutOfOrderSubmit = () => {
    updateCartStatus(selectedCart, 'out_of_order');
    setSelectedCart(null);
    setReason('');
    setMaintenanceContacted(false);
  };

  const onDragEnd = result => {
    if (!result.destination) {
      return;
    }

    const reorderedCarts = Array.from(carts);
    const [removed] = reorderedCarts.splice(result.source.index, 1);
    reorderedCarts.splice(result.destination.index, 0, removed);

    setCarts(reorderedCarts);

    const saveOrder = async () => {
      try {
        await axios.post(
          'http://localhost:5000/api/carts/order',
          { carts: reorderedCarts.map((cart, index) => ({ id: cart._id, order: index })) },
          {
            headers: {
              'x-auth-token': authState.token,
            },
          }
        );
      } catch (err) {
        console.error('Error saving cart order:', err);
      }
    };

    saveOrder();
  };

  if (authState.loading) {
    return <p>Loading...</p>;
  }

  if (!authState.isAuthenticated) {
    return <p>You are not authenticated</p>;
  }

  return (
    <div className="container">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
          <img src={deerCreekLogo} alt="Deer Creek Logo" className="d-inline-block align-top" height="30" />
      </nav>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="carts">
          {(provided) => (
            <ul className="list-group" {...provided.droppableProps} ref={provided.innerRef}>
              {carts.map((cart, index) => (
                <Draggable key={cart._id} draggableId={cart._id} index={index}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <strong>Cart {cart.Cart_Number}:</strong> {cart.Cart_Status}
                      </div>
                      <select
                        className="form-select"
                        value={cart.Cart_Status}
                        onChange={e => handleStatusChange(cart._id, e.target.value)}
                      >
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                        <option value="out_of_order">Out of Order</option>
                        <option value="charging">Charging</option>
                        <option value="staff_cart">Staff Cart</option>
                      </select>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>

      {selectedCart && (
        <div className="mt-4">
          <h2>Out of Order Details</h2>
          <label className="form-label">
            Reason:
            <textarea
              className="form-control"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </label>
          <br />
          <label className="form-check-label">
            Maintenance Contacted:
            <input
              type="checkbox"
              className="form-check-input"
              checked={maintenanceContacted}
              onChange={e => setMaintenanceContacted(e.target.checked)}
            />
          </label>
          <br />
          <button className="btn btn-primary mt-2" onClick={handleOutOfOrderSubmit}>Submit</button>
        </div>
      )}
    </div>
  );
};

export default ProtectedPage;
