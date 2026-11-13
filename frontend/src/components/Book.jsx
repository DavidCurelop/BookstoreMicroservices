import { Card } from "react-bootstrap";
import { Link } from "react-router-dom";

import { formatCurrency } from "../utils/currency.js";

const Book = ({ book }) => {
  const imageSource = book.image || "/book-placeholder.svg";

  return (
    <Card
      className="my-3 p-3 rounded shadow-sm h-100 book-card"
      style={{ transition: "transform 0.2s" }}
    >
      <Link to={`/book/${book.isbn}`}>
        <Card.Img
          src={imageSource}
          alt={`Portada de ${book.title}`}
          variant="top"
          style={{ height: "250px", objectFit: "cover" }}
        />
      </Link>

      <Card.Body className="d-flex flex-column">
        <Link to={`/book/${book.isbn}`} className="text-decoration-none">
          <Card.Title as="div">
            <strong>{book.title}</strong>
          </Card.Title>
        </Link>

        <Card.Text className="text-secondary small mb-2">
          {book.author}
        </Card.Text>

        <Card.Text className="mb-0 fw-semibold fs-6">
          {formatCurrency(book.price)}
        </Card.Text>
      </Card.Body>
    </Card>
  );
};

export default Book;
