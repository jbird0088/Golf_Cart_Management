import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const AdminPage = () => {
  const [carts, setCarts] = useState([]);
  const { authState } = useContext(AuthContext);

  useEffect(() => {
    const fetchCarts = async () => {
      if (!authState.loading && authState.isAuthenticated) {
        try {
          const res = await axios.get('http://localhost:5000/api/carts', {
            headers: {
              'x-auth-token': authState.token,
            },
          });
          setCarts(res.data);
        } catch (err) {
          console.error('Error fetching carts:', err);
        }
      }
    };
    fetchCarts();
  }, [authState.loading, authState.isAuthenticated, authState.token]);

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

  if (authState.loading) {
    return <p>Loading...</p>;
  }

  if (!authState.isAuthenticated || authState.user.role.toLowerCase() !== 'admin') {
    return <p>You are not authorized to view this page</p>;
  }

  return (
    <div>
      <h1>Admin Page</h1>
      <h2>Manage Cart Order</h2>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="carts">
          {(provided) => (
            <ul {...provided.droppableProps} ref={provided.innerRef}>
              {carts.map((cart, index) => (
                <Draggable key={cart._id} draggableId={cart._id} index={index}>
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      Cart {cart.Cart_Number}: {cart.Cart_Status}
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
