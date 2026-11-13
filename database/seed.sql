INSERT INTO books (
  isbn, title, author, description, category, publisher,
  publication_year, price, stock, image
)
VALUES
  ('9781491950357', 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Principles and practical techniques for building reliable, scalable, and maintainable data systems.', 'Data Systems', 'O''Reilly Media', 2017, 189900.00, 18, NULL),
  ('9781098115784', 'Designing Machine Learning Systems', 'Chip Huyen', 'An iterative framework for designing production-ready machine learning systems.', 'Machine Learning', 'O''Reilly Media', 2022, 174900.00, 15, NULL),
  ('9781492052203', 'Building Machine Learning Powered Applications', 'Emmanuel Ameisen', 'A practical path from a machine learning idea to a deployed application.', 'Machine Learning', 'O''Reilly Media', 2020, 159900.00, 12, NULL),
  ('9781617294433', 'Machine Learning Engineering', 'Andriy Burkov', 'Engineering principles for building and operating machine learning solutions.', 'Machine Learning', 'Manning', 2020, 149900.00, 10, NULL),
  ('9780132350884', 'Clean Code', 'Robert C. Martin', 'Principles and practices for writing maintainable software.', 'Software Engineering', 'Prentice Hall', 2008, 139900.00, 22, NULL),
  ('9780201616224', 'The Pragmatic Programmer', 'Andrew Hunt and David Thomas', 'Practical approaches to software development and professional engineering.', 'Software Engineering', 'Addison-Wesley', 1999, 129900.00, 16, NULL),
  ('9780131103627', 'The C Programming Language', 'Brian W. Kernighan and Dennis M. Ritchie', 'A concise introduction to the C programming language.', 'Programming', 'Prentice Hall', 1988, 119900.00, 9, NULL),
  ('9780262046305', 'Introduction to Algorithms', 'Thomas H. Cormen et al.', 'A comprehensive reference on algorithms and data structures.', 'Computer Science', 'MIT Press', 2022, 249900.00, 7, NULL),
  ('9781449373320', 'Designing Distributed Systems', 'Brendan Burns', 'Patterns and paradigms for building reliable distributed systems.', 'Distributed Systems', 'O''Reilly Media', 2018, 144900.00, 13, NULL),
  ('9781492078005', 'Fundamentals of Data Engineering', 'Joe Reis and Matt Housley', 'Concepts and practices across the data engineering lifecycle.', 'Data Engineering', 'O''Reilly Media', 2022, 179900.00, 19, NULL),
  ('9781098107963', 'Fundamentals of Software Architecture', 'Mark Richards and Neal Ford', 'An engineering approach to software architecture characteristics and trade-offs.', 'Software Architecture', 'O''Reilly Media', 2020, 169900.00, 14, NULL),
  ('9780134494166', 'Clean Architecture', 'Robert C. Martin', 'Architectural principles for creating maintainable software systems.', 'Software Architecture', 'Pearson', 2017, 154900.00, 11, NULL)
ON CONFLICT (isbn) DO NOTHING;

INSERT INTO customers (
  customer_id, first_name, last_name, email, city, country
)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Ana', 'Rojas', 'synthetic.customer.0001@bookstore.test', 'Medellín', 'Colombia'),
  ('00000000-0000-4000-8000-000000000002', 'Carlos', 'Gómez', 'synthetic.customer.0002@bookstore.test', 'Bogotá', 'Colombia'),
  ('00000000-0000-4000-8000-000000000003', 'Laura', 'Mejía', 'synthetic.customer.0003@bookstore.test', 'Cali', 'Colombia'),
  ('00000000-0000-4000-8000-000000000004', 'Andrés', 'Restrepo', 'synthetic.customer.0004@bookstore.test', 'Medellín', 'Colombia'),
  ('00000000-0000-4000-8000-000000000005', 'Mariana', 'López', 'synthetic.customer.0005@bookstore.test', 'Barranquilla', 'Colombia'),
  ('00000000-0000-4000-8000-000000000006', 'Santiago', 'Vélez', 'synthetic.customer.0006@bookstore.test', 'Pereira', 'Colombia'),
  ('00000000-0000-4000-8000-000000000007', 'Valentina', 'Ortiz', 'synthetic.customer.0007@bookstore.test', 'Manizales', 'Colombia'),
  ('00000000-0000-4000-8000-000000000008', 'Daniel', 'Ramírez', 'synthetic.customer.0008@bookstore.test', 'Medellín', 'Colombia')
ON CONFLICT DO NOTHING;
