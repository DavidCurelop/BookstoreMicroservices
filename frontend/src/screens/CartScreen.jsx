import {
  Alert,
  Button,
  Col,
  Form,
  Image,
  ListGroup,
  Row,
} from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";

import { useCart } from "../hooks/useCart.js";
import { useCreateOrder } from "../hooks/useOrders.js";
import { trackCheckoutStarted } from "../lib/cartAnalytics.js";
import { formatCurrency } from "../utils/currency.js";

const CartScreen = () => {
  const {
    items,
    totalItems,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const createOrder = useCreateOrder();
  const navigate = useNavigate();
  const isSubmitting = createOrder.isPending;

  const handleCheckout = () => {
    if (items.length === 0 || isSubmitting) {
      return;
    }

    trackCheckoutStarted(totalItems);

    createOrder.mutate(items, {
      onSuccess: (order) => {
        clearCart();
        navigate(`/orders/${order.id}/success`, { replace: true });
      },
    });
  };

  return (
    <>
      <h2 className="mb-4">Carrito de compras</h2>

      {createOrder.isError && (
        <Alert variant="danger">{createOrder.error.message}</Alert>
      )}

      {items.length === 0 ? (
        <p>
          Tu carrito está vacío. <Link to="/">Regresar al catálogo</Link>
        </p>
      ) : (
        <Row>
          <Col md={8}>
            <ListGroup variant="flush">
              {items.map((item) => (
                <ListGroup.Item key={item.bookId}>
                  <Row className="align-items-center">
                    <Col md={2}>
                      <Image
                        src={item.image || "/book-placeholder.svg"}
                        alt={`Portada de ${item.title}`}
                        fluid
                        rounded
                      />
                    </Col>
                    <Col md={4}>
                      <Link to={`/book/${item.isbn}`}>{item.title}</Link>
                    </Col>
                    <Col md={2}>{formatCurrency(item.price)}</Col>
                    <Col md={2}>
                      <Form.Control
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        aria-label={`Cantidad de ${item.title}`}
                        disabled={isSubmitting}
                        onChange={(event) =>
                          updateQuantity(item.bookId, event.target.value)
                        }
                      />
                    </Col>
                    <Col md={2}>
                      <Button
                        type="button"
                        variant="outline-danger"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => removeItem(item.bookId)}
                      >
                        Eliminar
                      </Button>
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>

          <Col md={4}>
            <ListGroup>
              <ListGroup.Item>
                <h4>Resumen</h4>
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Productos:</strong> {totalItems}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Subtotal:</strong> {formatCurrency(subtotal)}
              </ListGroup.Item>
              <ListGroup.Item>
                <Button
                  type="button"
                  className="w-100"
                  disabled={isSubmitting}
                  onClick={handleCheckout}
                >
                  {isSubmitting ? "Procesando compra..." : "Finalizar compra"}
                </Button>
              </ListGroup.Item>
            </ListGroup>
          </Col>
        </Row>
      )}
    </>
  );
};

export default CartScreen;
