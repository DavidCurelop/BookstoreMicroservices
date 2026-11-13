import React from "react";
import { Card, Col, Row } from "react-bootstrap";

import storeImage from "../assets/bookstore-store.jpg";
import { stores } from "../data/stores.js";

const StoresScreen = () => {
  return (
    <div>
      <h1 className="mb-3">Nuestras tiendas</h1>

      <img
        src={storeImage}
        alt="Tienda física de BookStore Co."
        className="img-fluid w-100 rounded mb-4"
        style={{
          maxHeight: "360px",
          objectFit: "cover",
        }}
      />

      <p className="lead mb-4">
        BookStore Co. combina su experiencia digital con espacios físicos
        diseñados para descubrir, explorar y disfrutar nuevas lecturas.
        Visítanos en cualquiera de nuestras tiendas y conoce una selección
        de libros, novedades editoriales y recomendaciones para cada lector.
      </p>

      <Row>
        {stores.map((store) => (
          <Col key={store.id} md={6} lg={4} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <Card.Title>{store.name}</Card.Title>

                <Card.Subtitle className="mb-3 text-secondary">
                  {store.city}
                </Card.Subtitle>

                <Card.Text className="mb-2">
                  <strong>Dirección</strong>
                  <br />
                  {store.address}
                </Card.Text>

                <Card.Text className="mb-2">
                  <strong>Horario</strong>
                  <br />
                  {store.schedule}
                </Card.Text>

                <Card.Text className="mb-0">
                  <strong>Teléfono</strong>
                  <br />
                  {store.phone}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default StoresScreen;