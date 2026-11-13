import { Container, Navbar, Nav, NavDropdown, Badge } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaShoppingCart, FaUser } from "react-icons/fa";
import logo from "../assets/bookstore-logo.svg";

import { useAuth } from "../hooks/useAuth.js";
import { useCart } from "../hooks/useCart.js";

const Header = () => {
    const navigate = useNavigate();
    const { user, isLoading, logout } = useAuth();
    const { totalItems } = useCart();

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (error) {
            console.error(error.message);
        }
    };

    return (
        <header>
            <Navbar bg="dark" variant="dark" expand="lg" collapseOnSelect>
                <Container>
                    <LinkContainer to="/">
                        <Navbar.Brand className="d-flex align-items-center gap-2">
                            <img
                                src={logo}
                                alt="BookStore Co."
                                height="32"
                            />
                            <span>BookStore Co.</span>
                        </Navbar.Brand>
                    </LinkContainer>

                    <Navbar.Toggle aria-controls="basic-navbar-nav" />

                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="ms-auto align-items-lg-center">
                            {!isLoading && user && (
                                <LinkContainer to="/cart">
                                    <Nav.Link
                                        className="d-flex align-items-center gap-1"
                                        aria-label={`Carrito con ${totalItems} artículos`}
                                    >
                                        <FaShoppingCart />

                                        {totalItems > 0 && (
                                            <Badge bg="secondary" pill>
                                                {totalItems}
                                            </Badge>
                                        )}
                                    </Nav.Link>
                                </LinkContainer>
                            )}

                            {!isLoading && (
                                !user ? (
                                    <LinkContainer to="/login">
                                        <Nav.Link className="d-flex align-items-center gap-1">
                                            <FaUser />
                                            <span>Iniciar sesión</span>
                                        </Nav.Link>
                                    </LinkContainer>
                                ) : (
                                    <NavDropdown
                                        id="user-dropdown"
                                        title={
                                            <span className="d-inline-flex align-items-center gap-1">
                                                <FaUser />
                                                <span>{user.firstName}</span>
                                            </span>
                                        }
                                    >
                                        <LinkContainer to="/profile">
                                            <NavDropdown.Item>
                                                Mi perfil
                                            </NavDropdown.Item>
                                        </LinkContainer>

                                        <LinkContainer to="/orders">
                                            <NavDropdown.Item>
                                                Mis compras
                                            </NavDropdown.Item>
                                        </LinkContainer>

                                        <NavDropdown.Divider />

                                        <NavDropdown.Item onClick={handleLogout}>
                                            Cerrar sesión
                                        </NavDropdown.Item>
                                    </NavDropdown>
                                )
                            )}

                            <LinkContainer to="/stores">
                                <Nav.Link>Tiendas</Nav.Link>
                            </LinkContainer>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        </header>
    );
};

export default Header;