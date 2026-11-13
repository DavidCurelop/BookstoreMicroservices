import { Card, Col, Container, ListGroup, Row } from "react-bootstrap";

import { useAuth } from "../hooks/useAuth.js";

const ProfileScreen = () => {
  const { user } = useAuth();

  return (
    <Container className="py-5">
      <h2 className="mb-4" style={{ marginLeft: 0 }}>Mi Perfil</h2>
      <Row className="justify-content-center">
        <Col md={10}>
          <Card className="shadow rounded-4 p-4">
            <Card.Body>
              <h3>
                {user.firstName} {user.lastName}
              </h3>

              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Email:</strong> {user.email}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Ciudad:</strong> {user.city || "No registrada"}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>País:</strong> {user.country || "No registrado"}
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfileScreen;
