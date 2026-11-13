import { Alert, Button, Card, Spinner } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";

import { useOrder } from "../hooks/useOrders.js";
import { formatCurrency } from "../utils/currency.js";

const OrderSuccessScreen = () => {
  const { orderId } = useParams();
  const { data: order, isPending, isError, error } = useOrder(orderId);

  if (isPending) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" />
          <p className="mt-3 mb-0">Cargando compra...</p>
        </Card.Body>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title>Compra procesada</Card.Title>
          <Alert variant="danger" className="mt-3">
            {error.message}
          </Alert>
          <div className="d-flex gap-2 flex-wrap">
            <Button as={Link} to="/orders">
              Ver mis compras
            </Button>
            <Button as={Link} to="/" variant="outline-secondary">
              Volver al catálogo
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Card.Title className="mb-3">Compra realizada</Card.Title>

        <Card.Text className="mb-2">
          Tu compra fue registrada correctamente.
        </Card.Text>

        <Card.Text className="mb-1">
          <strong>Orden:</strong> {order.id}
        </Card.Text>

        <Card.Text className="mb-1">
          <strong>Productos:</strong> {order.totalQuantity}
        </Card.Text>

        <Card.Text className="mb-4">
          <strong>Total:</strong> {formatCurrency(order.totalAmount)}
        </Card.Text>

        <div className="d-flex gap-2 flex-wrap">
          <Button as={Link} to="/orders">
            Ver mis compras
          </Button>
          <Button as={Link} to="/" variant="outline-secondary">
            Volver al catálogo
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default OrderSuccessScreen;
