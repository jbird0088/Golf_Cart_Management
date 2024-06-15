import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import deerCreekLogo from '../Logo/deercreek-logo.png'; // Import the logo
import '../styles.css'; // Import the CSS file
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const AdminPage = () => {
  const [carts, setCarts] = useState([]);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', role: '', password: '' });
  const [newCartNumber, setNewCartNumber] = useState('');
  const [newCartStatus, setNewCartStatus] = useState('available');
  const { authState, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!authState.loading && authState.isAuthenticated) {
        try {
          const resCarts = await axios.get('http://localhost:5000/api/carts', {
            headers: {
              'x-auth-token': authState.token,
            },
          });
          setCarts(resCarts.data);

          const resUsers = await axios.get('http://localhost:5000/api/users', {
            headers: {
              'x-auth-token': authState.token,
            },
          });
          setUsers(resUsers.data);
        } catch (err) {
          console.error('Error fetching initial data:', err);
        }
      }
    };

    fetchInitialData();

    const eventSource = new EventSource('http://localhost:5000/api/updates');
    eventSource.onmessage = function(event) {
      const updatedCarts = JSON.parse(event.data);
      setCarts(updatedCarts);
    };

    return () => {
      eventSource.close();
    };
  }, [authState.loading, authState.isAuthenticated, authState.token]);

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/users/register', newUser, {
        headers: {
          'x-auth-token': authState.token,
        },
      });
      alert('User registered successfully');
      setNewUser({ username: '', role: '', password: '' });
      const resUsers = await axios.get('http://localhost:5000/api/users', {
        headers: {
          'x-auth-token': authState.token,
        },
      });
      setUsers(resUsers.data);
    } catch (err) {
      console.error('Error registering user:', err);
      alert('Error registering user');
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await axios.delete(`http://localhost:5000/api/users/${userId}`, {
        headers: {
          'x-auth-token': authState.token,
        },
      });
      setUsers(users.filter(user => user._id !== userId));
      alert('User removed successfully');
    } catch (err) {
      console.error('Error removing user:', err);
      alert('Error removing user');
    }
  };

  const handleAddCart = async () => {
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
      setCarts([...carts, res.data]);
      setNewCartNumber('');
      setNewCartStatus('available');
    } catch (err) {
      console.error('Error adding new cart:', err);
    }
  };

  const handleRemoveCart = async (cartId) => {
    try {
      await axios.delete(`http://localhost:5000/api/carts/${cartId}`, {
        headers: {
          'x-auth-token': authState.token,
        },
      });
      setCarts(carts.filter(cart => cart._id !== cartId));
      alert('Cart removed successfully');
    } catch (err) {
      console.error('Error removing cart:', err);
      alert('Error removing cart');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login page
  };

  const handleProtectedPage = () => {
    navigate('/');
  };

  const updateCartOrder = async (reorderedCarts) => {
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

  const onDragEnd = result => {
    if (!result.destination) {
      return;
    }

    const reorderedCarts = Array.from(carts);
    const [removed] = reorderedCarts.splice(result.source.index, 1);
    reorderedCarts.splice(result.destination.index, 0, removed);

    setCarts(reorderedCarts);
    updateCartOrder(reorderedCarts);
  };

  const handleStatusChange = async (cartId, status) => {
    const cart = carts.find(c => c._id === cartId);
    if (!cart) return;

    try {
      const response = await axios.put(
        `http://localhost:5000/api/carts/${cartId}`,
        { Cart_Status: status },
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

  if (authState.loading) {
    return <p>Loading...</p>;
  }

  if (!authState.isAuthenticated || authState.user.role.toLowerCase() !== 'admin') {
    alert('You are not authorized to view this page');
    return <p>You are not authorized to view this page</p>;
  }

  return (
    <div className="container">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            <img src={deerCreekLogo} alt="Deer Creek Logo" className="d-inline-block align-top" height="30" />
          </a>
          <div className="d-flex ml-auto align-items-center">
            <button className="btn btn-outline-light mr-2" onClick={handleProtectedPage}>Protected Page</button>
            <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>
      <h1 className="my-4">Admin Page</h1>

      {/* Register New User */}
      <div className="card mb-4">
        <div className="card-body">
          <h2>Register New User</h2>
          <form onSubmit={handleRegisterUser}>
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                name="username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, [e.target.name]: e.target.value })}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Role:</label>
              <input
                type="text"
                name="role"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, [e.target.name]: e.target.value })}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                name="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, [e.target.name]: e.target.value })}
                className="form-control"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary mt-3">Register</button>
          </form>
        </div>
      </div>

      {/* Show Users */}
      <div className="card mb-4">
        <div className="card-body">
          <h2>All Users</h2>
          <ul className="list-group">
            {users.map(user => (
              <li key={user._id} className="list-group-item d-flex justify-content-between align-items-center">
                {user.username} - {user.role}
                <button onClick={() => handleRemoveUser(user._id)} className="btn btn-danger">Remove</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Manage Cart Order */}
      <h2 className="mb-4">Manage Cart Order</h2>
      <div className="add-cart-form mb-4">
        <input
          type="text"
          placeholder="New Cart Number"
          value={newCartNumber}
          onChange={(e) => setNewCartNumber(e.target.value)}
          className="form-control mr-2"
        />
        <select
          value={newCartStatus}
          onChange={(e) => setNewCartStatus(e.target.value)}
          className="form-control mr-2"
        >
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
          <option value="out_of_order">Out of Order</option>
          <option value="charging">Charging</option>
          <option value="staff_cart">Staff Cart</option>
        </select>
        <button onClick={handleAddCart} className="btn btn-primary">Add Cart</button>
      </div>
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
                        <strong>Cart {cart.Cart_Number}:</strong> {cart.Cart_Status} (Unavailable: {cart.TimesUnavailable})
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
                      <button onClick={() => handleRemoveCart(cart._id)} className="btn btn-danger ml-2">Remove</button>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default AdminPage;
