import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Container } from "react-bootstrap";

import Header from "./components/Header";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import HomeScreen from "./screens/HomeScreen";
import BookScreen from "./screens/BookScreen";
import StoresScreen from "./screens/StoresScreen";
import LoginScreen from "./screens/Login";
import ProfileScreen from "./screens/ProfileScreen";
import CartScreen from "./screens/CartScreen";
import OrderSuccessScreen from "./screens/OrderSuccessScreen";
import OrdersScreen from "./screens/OrdersScreen";

const App = () => {
  return (
    <Router>
      <Header />
      <main className="py-3">
        <Container>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/stores" element={<StoresScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/book/:isbn" element={<BookScreen />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/cart" element={<CartScreen />} />
              <Route path="/orders" element={<OrdersScreen />} />
              <Route
                path="/orders/:orderId/success"
                element={<OrderSuccessScreen />}
              />
            </Route>
          </Routes>
        </Container>
      </main>
      <Footer />
    </Router>
  );
};

export default App;
