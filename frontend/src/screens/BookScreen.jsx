import { useState } from "react";
import { Alert, Button, Col, Form, Image, ListGroup, Row } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../hooks/useAuth.js";
import { useBook } from "../hooks/useBooks.js";
import { useCart } from "../hooks/useCart.js";
import { formatCurrency } from "../utils/currency.js";

const toAddToCartMessage = (requestedQuantity, addedQuantity) => {
  if (addedQuantity === 0) {
    return {
      variant: "warning",
      text: "Ya tienes en el carrito todas las unidades disponibles.",
    };
  }

  if (addedQuantity < requestedQuantity) {
    return {
      variant: "warning",
      text: `Solo se agregaron ${addedQuantity} unidades por disponibilidad de stock.`,
    };
  }

  return { variant: "success", text: "El libro fue agregado al carrito." };
};

const BookScreen = () => {
  const { isbn } = useParams();
  const { data: book, isPending, isError } = useBook(isbn);

  if (isError) {
    return <p role="alert">No fue posible cargar la información del libro.</p>;
  }

  if (isPending) {
    return <p>Cargando...</p>;
  }

  // The key resets the detail's local state whenever another book is shown.
  return <BookDetail key={book.id} book={book} />;
};

const BookDetail = ({ book }) => {
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState(null);
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = () => {
    if (!user) {
      navigate("/login", { state: { from: `/book/${book.isbn}` } });
      return;
    }

    const addedQuantity = addItem(book, quantity);
    setMessage(toAddToCartMessage(quantity, addedQuantity));
  };

  return (
    <>
      <div className="mb-4">
        <Link to="/" style={{ textDecoration: "none" }}>
          <Button variant="light" aria-label="Regresar a la página principal">
            ← Regresar al Catálogo
          </Button>
        </Link>
      </div>

      {message && <Alert variant={message.variant}>{message.text}</Alert>}

      <Row>
        <Col md={4}>
          <Image
            src={book.image || "/book-placeholder.svg"}
            alt={`Portada de ${book.title}`}
            fluid
          />
        </Col>

        <Col md={4}>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <h3>{book.title}</h3>
            </ListGroup.Item>
            <ListGroup.Item>Autor: {book.author}</ListGroup.Item>
            <ListGroup.Item>Descripción: {book.description}</ListGroup.Item>
            <ListGroup.Item>ISBN: {book.isbn}</ListGroup.Item>
          </ListGroup>
        </Col>

        <Col md={3}>
          <ListGroup variant="flush">
            <ListGroup.Item>
              Estado: {book.stock > 0 ? "Disponible" : "No Disponible"} ({book.stock}) uds
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Precio:</strong> {formatCurrency(book.price)}
            </ListGroup.Item>
            <ListGroup.Item>
              <Form.Group controlId="bookQuantity">
                <Form.Label>Cantidad</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max={book.stock}
                  value={quantity}
                  disabled={book.stock === 0}
                  onChange={(event) => {
                    const nextQuantity = Number.parseInt(event.target.value, 10);

                    if (
                      Number.isInteger(nextQuantity) &&
                      nextQuantity >= 1 &&
                      nextQuantity <= book.stock
                    ) {
                      setQuantity(nextQuantity);
                    }
                  }}
                />
              </Form.Group>
            </ListGroup.Item>
            <ListGroup.Item>
              <Button
                type="button"
                className="w-100"
                disabled={book.stock === 0}
                onClick={handleAddToCart}
              >
                Agregar al carrito
              </Button>
            </ListGroup.Item>
          </ListGroup>
        </Col>
      </Row>
    </>
  );
};

export default BookScreen;
