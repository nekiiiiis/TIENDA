const typeDefs = `#graphql
  # Enumeraciones
  enum OrderStatus {
    pending
    completed
  }

  enum ProductCategory {
    fuegos_artificiales
    petardos
    bengalas
    cohetes
    otros
  }

  enum UserRole {
    user
    admin
  }

  # Tipos de datos
  type User {
    id: ID!
    username: String!
    role: UserRole!
    createdAt: String!
    updatedAt: String!
  }

  type Product {
    id: ID!
    nombre: String!
    precio: Float!
    descripcion: String!
    imagen: String
    categoria: String!
    createdAt: String!
    updatedAt: String!
  }

  type OrderItem {
    productId: ID!
    nombre: String!
    precio: Float!
    cantidad: Int!
    subtotal: Float!
  }

  type Order {
    id: ID!
    userId: ID!
    username: String!
    items: [OrderItem!]!
    total: Float!
    status: OrderStatus!
    createdAt: String!
    updatedAt: String!
  }

  type CartItem {
    productId: ID!
    nombre: String!
    precio: Float!
    imagen: String
    cantidad: Int!
  }

  type Cart {
    id: ID!
    userId: ID!
    items: [CartItem!]!
    total: Float!
  }

  # Inputs para mutaciones
  input OrderItemInput {
    productId: ID!
    nombre: String!
    precio: Float!
    cantidad: Int!
  }

  input CreateOrderInput {
    items: [OrderItemInput!]!
  }

  input CartItemInput {
    productId: ID!
    cantidad: Int!
  }

  # Queries
  type Query {
    # Productos
    products: [Product!]!
    product(id: ID!): Product
    productsByCategory(categoria: String!): [Product!]!
    searchProducts(search: String!): [Product!]!

    # Pedidos
    orders(status: OrderStatus): [Order!]!
    order(id: ID!): Order
    myOrders: [Order!]!

    # Carrito
    myCart: Cart

    # Usuarios (solo admin)
    users: [User!]!
    user(id: ID!): User
  }

  # Mutaciones
  type Mutation {
    # Carrito
    addToCart(productId: ID!, cantidad: Int): Cart!
    updateCartItem(productId: ID!, cantidad: Int!): Cart!
    removeFromCart(productId: ID!): Cart!
    clearCart: Cart!

    # Pedidos
    createOrder: Order!
    updateOrderStatus(id: ID!, status: OrderStatus!): Order!
    cancelOrder(id: ID!): Order!

    # Usuarios (solo admin)
    updateUserRole(id: ID!, role: UserRole!): User!
    deleteUser(id: ID!): Boolean!
  }
`;

module.exports = typeDefs;
