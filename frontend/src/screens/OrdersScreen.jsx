import { useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Col,
  Container,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";

import { useOrder, useOrders } from "../hooks/useOrders.js";
import { formatCurrency } from "../utils/currency.js";
import { formatDate } from "../utils/date.js";

const OrderDetail = ({ orderId }) => {
  const { data: order, isPending, isError, error } = useOrder(orderId);

  if (isPending) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" role="status" />
        <span className="ms-2">Cargando detalle...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="danger" className="mb-0">
        {error.message}
      </Alert>
    );
  }

  return (
    <>
      <Table responsive hover className="align-middle mb-3">
        <thead>
          <tr>
            <th>LIBRO</th>
            <th>ISBN</th>
            <th className="text-center">CANTIDAD</th>
            <th className="text-end">PRECIO</th>
            <th className="text-end">TOTAL</th>
          </tr>
        </thead>

        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.title}</strong>
                <div className="small text-secondary">{item.author}</div>
              </td>

              <td>{item.isbn}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-end">{formatCurrency(item.unitPrice)}</td>
              <td className="text-end">{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="text-end">
        <span className="text-secondary me-3">Total de la compra</span>
        <strong>{formatCurrency(order.totalAmount)}</strong>
      </div>
    </>
  );
};

const OrdersScreen = () => {
  const { data: orders = [], isPending, isError, error } = useOrders();

  // Details are fetched the first time an order is expanded and then kept
  // rendered, so collapsing an order does not blank it mid-animation.
  const [expandedOrderIds, setExpandedOrderIds] = useState(() => new Set());

  const handleSelect = (eventKey) => {
    if (eventKey && !expandedOrderIds.has(eventKey)) {
      setExpandedOrderIds((currentIds) => new Set(currentIds).add(eventKey));
    }
  };

  if (isPending) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" />
        <p className="mt-3 mb-0">Cargando mis compras...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Mis compras</h2>

      {isError && <Alert variant="danger">{error.message}</Alert>}

      {!isError && orders.length === 0 && (
        <Alert variant="light">Aún no tienes compras registradas.</Alert>
      )}

      {!isError && orders.length > 0 && (
        <Accordion onSelect={handleSelect}>
          {orders.map((order) => (
            <Accordion.Item key={order.id} eventKey={order.id}>
              <Accordion.Header>
                <Container fluid className="px-0">
                  <Row className="align-items-center w-100">
                    <Col md={4} className="mb-2 mb-md-0">
                      <strong>{formatDate(order.orderTimestamp)}</strong>
                      <div className="small text-secondary text-break">
                        Orden {order.id}
                      </div>
                    </Col>

                    <Col md={2} className="mb-2 mb-md-0">
                      {order.totalQuantity} producto
                      {order.totalQuantity !== 1 ? "s" : ""}
                    </Col>

                    <Col md={3} className="mb-2 mb-md-0">
                      <strong>{formatCurrency(order.totalAmount)}</strong>
                    </Col>

                    <Col md={3}>
                      <Badge bg="secondary">{order.status}</Badge>
                    </Col>
                  </Row>
                </Container>
              </Accordion.Header>

              <Accordion.Body>
                {expandedOrderIds.has(order.id) && (
                  <OrderDetail orderId={order.id} />
                )}
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Container>
  );
};

export default OrdersScreen;
