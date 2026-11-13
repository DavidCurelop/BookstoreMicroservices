import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth.js";

const getReturnPath = (locationState) => {
  const returnPath = locationState?.from;

  if (
    typeof returnPath === "string" &&
    returnPath.startsWith("/") &&
    !returnPath.startsWith("//")
  ) {
    return returnPath;
  }

  return "/";
};

const Login = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString().trim();

    try {
      await login(email);
      navigate(getReturnPath(location.state), { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <Card className="p-10 shadow rounded-4" style={{ width: "25rem" }}>
        <Card.Body>
          <h3 className="text-center mb-4">Iniciar Sesión</h3>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="formBasicEmail">
              <Form.Label>Correo electrónico:</Form.Label>
              <Form.Control
                type="email"
                name="email"
                autoComplete="email"
                required
              />
            </Form.Group>

            {error && <p role="alert">{error}</p>}

            <Button
              variant="primary"
              type="submit"
              className="w-100 mt-5 rounded-pill py-10"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
