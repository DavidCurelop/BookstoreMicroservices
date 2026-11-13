import { Col, Row } from "react-bootstrap";

import HomeCarousel from "../components/Carousel";
import Book from "../components/Book";
import { useBooks } from "../hooks/useBooks.js";

const HomeScreen = () => {
  const { data: books = [], isError } = useBooks();

  return (
    <>
      <HomeCarousel />

      <div className="container my-5">
        <h2 className="mb-4">Los Más Vendidos</h2>
        {isError && <p role="alert">No fue posible cargar el catálogo.</p>}
        <Row>
          {books.map((book) => (
            <Col key={book.id} sm={12} md={6} lg={4} xl={3}>
              <Book book={book} />
            </Col>
          ))}
        </Row>
      </div>
    </>
  );
};

export default HomeScreen;
